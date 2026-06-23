#!/usr/bin/env node

import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

const ROOT = resolve('.');
const DOCS_ROOT = join(ROOT, 'docs', 'topics');
const REPORT_FILE = join(ROOT, '.docs-report.jsonl');
const CONFIG_FILE = join(ROOT, '.docs-verify.config.json');
const RAW_ARGS = process.argv.slice(2);

const PASS1_MAX_NODES = 5;
const PASS1_MAX_EDGES = 5;
const PASS2_SCOPE_DEFAULT = 'changed';
const DOCS_SCOPE_DEFAULT = PASS2_SCOPE_DEFAULT;

const REPORT_STAGES = {
  PASS_1: 'PASS-1',
  PASS_2: 'PASS-2',
  CHECK: 'CHECK',
  EVIDENCE: 'EVIDENCE',
  IMPACT: 'IMPACT',
  EVAL: 'EVAL',
};

const PROFILE_VALUES = new Set(['reference', 'behavior', 'contract']);
const RISK_VALUES = new Set(['low', 'medium', 'high']);
const DOCUMENTATION_MATURITY_VALUES = new Set(['draft', 'current', 'verified']);
const MIN_A_GLANCE_LINES = 6;

const DEFAULT_VERIFIER_CONFIG = {
  no_warnings: false,
};

function parseBooleanArg(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }

  const normalized = String(raw).toLowerCase();
  if (['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'f', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return null;
}

function loadVerifierConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_VERIFIER_CONFIG;
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_VERIFIER_CONFIG,
      ...parsed,
      no_warnings: parsed && typeof parsed.no_warnings === 'boolean' ? parsed.no_warnings : DEFAULT_VERIFIER_CONFIG.no_warnings,
    };
  } catch (error) {
    console.error(`DOC-LOAD: failed to parse ${relative(ROOT, CONFIG_FILE)}; using defaults.`);
    return DEFAULT_VERIFIER_CONFIG;
  }
}

function normalizeBooleanConfig(raw) {
  const parsed = parseBooleanArg(raw);
  return parsed === null ? null : parsed;
}

const VERIFIER_CONFIG = loadVerifierConfig();
const CLI_NO_WARNINGS = normalizeBooleanConfig(getArg('no-warnings'));
const STRICT_NO_WARNINGS = CLI_NO_WARNINGS === null
  ? VERIFIER_CONFIG.no_warnings
  : CLI_NO_WARNINGS;

function getArg(name) {
  const inline = RAW_ARGS.find((arg) => arg.startsWith(`--${name}=`));
  const spaced = RAW_ARGS.find((arg) => arg === `--${name}`);
  return inline ? inline.split('=', 2)[1] : (spaced ? RAW_ARGS[RAW_ARGS.indexOf(spaced) + 1] : null);
}

function parsePassMode(value) {
  const normalized = String(value ?? 'both').toLowerCase();
  if (['1', 'pass1', 'onboarding'].includes(normalized)) {
    return 'pass1';
  }
  if (['2', 'pass2', 'deep', 'deep-validation', 'remaining'].includes(normalized)) {
    return 'pass2';
  }
  if (normalized === 'both') {
    return 'both';
  }
  return null;
}

function parseVerifierMode(value) {
  const normalized = String(value || '').toLowerCase();
  if (['check', 'evidence', 'impact', 'eval', 'editorial', 'docs:eval'].includes(normalized)) {
    return normalized === 'editorial' || normalized === 'docs:eval' ? 'eval' : normalized;
  }
  return null;
}

function rawHasPassLikeArg() {
  return RAW_ARGS.some((arg) => arg === '--pass' || arg === '--pass=1' || arg === '--pass=2' || arg === '--pass=pass1' || arg === '--pass=pass2' || arg === '--pass=both');
}

const VERIFIER_MODE = (() => {
  const modeArg = getArg('mode');
  const positional = RAW_ARGS.find((arg) => arg && !arg.startsWith('-'));
  if (modeArg) {
    const parsed = parseVerifierMode(modeArg);
    if (parsed) {
      return parsed;
    }
    console.error(`DOC-LOAD: unknown mode "${modeArg}". Use --mode=check, --mode=evidence, --mode=impact, or --mode=eval.`);
    process.exit(2);
  }

  if (positional) {
    const parsed = parseVerifierMode(positional);
    if (parsed) {
      return parsed;
    }
  }

  const passValue = getArg('pass');
  if (passValue || rawHasPassLikeArg()) {
    return 'legacy';
  }

  return 'legacy';
})();

const PASS_MODE = (() => {
  const inline = RAW_ARGS.find((arg) => arg.startsWith('--pass='));
  const spaced = RAW_ARGS.find((arg) => arg === '--pass');
  const value = inline ? inline.split('=', 2)[1] : (spaced ? RAW_ARGS[RAW_ARGS.indexOf(spaced) + 1] : null);
  const parsed = parsePassMode(value);
  if (parsed) {
    return parsed;
  }
  if (VERIFIER_MODE === 'legacy') {
    console.error(`DOC-LOAD: unknown pass "${value}". Use --pass=both, --pass=1, or --pass=2.`);
    process.exit(2);
  }
  return 'both';
})();

const DOCS_SCOPE = (() => {
  const inline = RAW_ARGS.find((arg) => arg.startsWith('--scope='));
  const spaced = RAW_ARGS.find((arg) => arg === '--scope');
  const value = (inline ? inline.split('=', 2)[1] : spaced ? RAW_ARGS[RAW_ARGS.indexOf(spaced) + 1] : null) ?? PASS2_SCOPE_DEFAULT;
  const normalized = String(value).toLowerCase();

  if (['changed', 'incremental'].includes(normalized)) {
    return 'changed';
  }

  if (['all', 'full'].includes(normalized)) {
    return 'all';
  }

  console.error(`DOC-LOAD: unknown scope "${value}". Use --scope=changed or --scope=all.`);
  process.exit(2);
})();

const violations = [];

function toStringList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value));
  }

  if (typeof raw !== 'string') {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [trimmed];
  }

  return trimmed
    .slice(1, -1)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => value.replace(/^["']|["']$/g, ''));
}

function parseYamlScalar(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') {
    return '';
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function splitDelimitedList(raw) {
  return String(raw || '')
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function normalizeDocPath(filePath) {
  if (!filePath) {
    return '';
  }
  return filePath.replace(/^\.\/+/, '').replace(/`/g, '').trim();
}

function toFilePathRef(rawRef) {
  return normalizeDocPath(String(rawRef).replace(/#.*$/, '').trim());
}

function normalizePosixPath(rawPath) {
  return String(rawPath || '')
    .replaceAll('\\', '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '')
    .trim();
}

function pathPatternMatch(needle, pattern) {
  const normalizedNeedle = normalizePosixPath(needle);
  const normalizedPattern = normalizePosixPath(pattern);
  if (!normalizedNeedle || !normalizedPattern) {
    return false;
  }

  if (normalizedNeedle === normalizedPattern) {
    return true;
  }

  if (normalizedNeedle.endsWith(`/${normalizedPattern}`) || normalizedNeedle.startsWith(`${normalizedPattern}/`)) {
    return true;
  }

  if (normalizedPattern.includes('*')) {
    const wildcard = `^${escapeRegex(normalizedPattern).replace(/\\\*/g, '.*')}$`;
    const regex = new RegExp(wildcard);
    return regex.test(normalizedNeedle);
  }

  return normalizedNeedle.includes(`/${normalizedPattern}`);
}

function looksLikeSourcePath(rawPath) {
  return /^[A-Za-z0-9_.\-\/]+(?:\.[a-z0-9]+)?$/.test(rawPath);
}

function extractEvidenceRefs(raw) {
  const expanded = String(raw || '').replace(/`/g, '');
  return splitDelimitedList(expanded)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseSimpleFrontmatter(markdown) {
  if (!markdown.startsWith('---')) {
    return {raw: '', data: {}, hasFrontmatter: false};
  }

  const lines = markdown.split(/\r?\n/);
  if (lines[0] !== '---') {
    return {raw: '', data: {}, hasFrontmatter: false};
  }

  const fmLines = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---') {
      break;
    }
    fmLines.push(lines[i]);
  }

  return {raw: fmLines.join('\n'), data: parseYamlText(fmLines.join('\n')), hasFrontmatter: true};
}

function parseYamlText(rawText) {
  const lines = rawText.split(/\r?\n/);
  const data = {};
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
      index += 1;
      continue;
    }

    const keyMatch = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(rawLine);
    if (!keyMatch) {
      index += 1;
      continue;
    }

    const key = keyMatch[1];
    const firstValue = keyMatch[2].trim();
    index += 1;

    if (!firstValue) {
      let nextIndex = index;
      while (nextIndex < lines.length && (!lines[nextIndex].trim() || lines[nextIndex].trim().startsWith('#'))) {
        nextIndex += 1;
      }

      const listStart = lines[nextIndex] || '';
      if (/^\s+-\s+/.test(listStart)) {
        const list = [];
        while (index < lines.length) {
          const listLine = lines[index];
          const itemMatch = /^\s+-\s+(.+)$/.exec(listLine);
          if (!itemMatch) {
            break;
          }

          list.push(parseYamlScalar(itemMatch[1]));
          index += 1;
        }
        data[key] = list;
        continue;
      }

      if (/^\s+[A-Za-z0-9_-]+:\s*/.test(listStart)) {
        const nested = {};
        while (index < lines.length) {
          const nestedLine = lines[index];
          if (!nestedLine.trim() || nestedLine.trim().startsWith('#')) {
            index += 1;
            continue;
          }

          if (!/^\s+[A-Za-z0-9_-]+:\s*/.test(nestedLine)) {
            break;
          }

          const nestedMatch = /^\s+([A-Za-z0-9_-]+):\s*(.*)$/.exec(nestedLine);
          if (nestedMatch) {
            nested[nestedMatch[1]] = parseYamlScalar(nestedMatch[2]);
          }
          index += 1;
        }

        data[key] = nested;
        continue;
      }

      data[key] = [];
      continue;
    }

    data[key] = parseYamlScalar(firstValue);
  }

  return data;
}

function parseAgentEntryQueryIds(frontmatterText) {
  const ids = new Set();
  const lines = frontmatterText.split(/\r?\n/);
  let inQueries = false;
  let indent = 0;

  for (const line of lines) {
    const header = line.match(/^(\s*)agent_entry_queries:\s*$/);
    if (header) {
      inQueries = true;
      indent = header[1].length;
      continue;
    }

    if (!inQueries) {
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    const leading = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (leading <= indent) {
      inQueries = false;
      continue;
    }

    const match = /^\s*-\s*id:\s*([a-z-]+)\s*$/i.exec(line);
    if (match) {
      ids.add(match[1].toLowerCase());
    }
  }

  return [...ids];
}

function parseIntArgLine(line) {
  const parsed = Number.parseInt(line, 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

function escapeQuotes(input) {
  return String(input ?? '').replaceAll('"', '\\"');
}

function formatPassLabel(modeOrPass) {
  if (modeOrPass === 'pass1') {
    return REPORT_STAGES.PASS_1;
  }
  if (modeOrPass === 'pass2') {
    return REPORT_STAGES.PASS_2;
  }
  if (modeOrPass === 'both') {
    return REPORT_STAGES.PASS_2;
  }
  if (modeOrPass === 'check') {
    return REPORT_STAGES.CHECK;
  }
  if (modeOrPass === 'evidence') {
    return REPORT_STAGES.EVIDENCE;
  }
  if (modeOrPass === 'impact') {
    return REPORT_STAGES.IMPACT;
  }
  if (modeOrPass === 'eval') {
    return REPORT_STAGES.EVAL;
  }
  if (modeOrPass === 1) {
    return REPORT_STAGES.PASS_1;
  }
  if (modeOrPass === 2) {
    return REPORT_STAGES.PASS_2;
  }
  if (typeof modeOrPass === 'number') {
    return `PASS-${modeOrPass}`;
  }
  return String(modeOrPass || '').toUpperCase();
}

function appendReportRecord(entry) {
  writeFileSync(REPORT_FILE, `${JSON.stringify(entry)}\n`, {flag: 'a'});
}

function record(modeOrPass, kind, file, line, code, parser, desc, remediation, details = {}) {
  const relFile = relative(ROOT, file);
  const passLabel = formatPassLabel(modeOrPass);
  const lineText = `DOC-LOAD[${passLabel}][${kind}] ${relFile}:${line}:1 code=${code} parser=${parser} desc="${escapeQuotes(desc)}" remediation="${escapeQuotes(remediation)}"`;
  const modeValue = typeof modeOrPass === 'number' || typeof modeOrPass === 'string'
    ? passLabel
    : String(modeOrPass);

  const entry = {
    type: 'DOC-LOAD',
    mode: modeValue,
    pass: passLabel,
    kind,
    file: relFile,
    line,
    code,
    parser,
    ...details,
    desc,
    remediation,
  };

  violations.push(entry);
  appendReportRecord(entry);
  console.log(lineText);

  if (process.env.GITHUB_ACTIONS === 'true') {
    const annotationTitle = kind === 'STRUCTURE'
      ? `DOC-LOAD(${passLabel}): Cognitive-load guardrail failed`
      : `DOC-LOAD(${passLabel}): Mermaid parse failed`;
    console.log(`::error file=${relFile},line=${line},col=1,title=${annotationTitle}::[${code}] ${escapeQuotes(desc)}`);
  }
}

function isMermaidOpen(line) {
  return /^```mermaid\s*$/i.test(line.trim());
}

function isMermaidClose(line) {
  return /^```\s*$/.test(line.trim());
}

function collectMarkdownFiles(dir, out = []) {
  if (!existsSync(dir)) {
    return out;
  }

  const entries = readdirSync(dir, {withFileTypes: true});
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }

    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(path, out);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(path);
    }
  }

  return out;
}

function runGit(args) {
  const child = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 4000,
  });

  if (child.status !== 0) {
    return null;
  }

  return String(child.stdout ?? '');
}

function normalizeGitPath(rawPath) {
  return rawPath.trim().replaceAll('\\', '/');
}

function collectChangedMarkdownFiles() {
  if (!existsSync(join(ROOT, '.git'))) {
    return [];
  }

  let baseRef = 'origin/main';
  const mergeBase = runGit(['merge-base', 'HEAD', baseRef]);
  if (mergeBase && mergeBase.trim()) {
    baseRef = mergeBase.trim();
  }

  let changedOutput = null;
  for (const range of [`${baseRef}...HEAD`, 'HEAD~1...HEAD']) {
    const output = runGit(['diff', '--name-only', range, '--', join('docs', 'topics')]);
    if (output && output.trim()) {
      changedOutput = output;
      break;
    }
  }

  if (!changedOutput) {
    changedOutput = runGit(['status', '--porcelain=v1', '--', join('docs', 'topics')]);
  }

  const changed = new Set();
  if (!changedOutput) {
    return [];
  }

  const lines = changedOutput.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  for (const line of lines) {
    if (line.includes(' -> ')) {
      continue;
    }

    let filePath = '';
    if (/^(?:[MADCRU]\s+|^\?\?)/.test(line)) {
      filePath = normalizeGitPath(line.slice(3));
    } else {
      filePath = normalizeGitPath(line);
    }

    if (!filePath.startsWith('docs/topics/')) {
      continue;
    }

    if (!filePath.endsWith('.md')) {
      continue;
    }

    const fullPath = join(ROOT, filePath);
    if (!existsSync(fullPath)) {
      continue;
    }

    changed.add(fullPath);
  }

  return [...changed].sort();
}

function collectChangedFiles() {
  if (!existsSync(join(ROOT, '.git'))) {
    return [];
  }

  let baseRef = 'origin/main';
  const mergeBase = runGit(['merge-base', 'HEAD', baseRef]);
  if (mergeBase && mergeBase.trim()) {
    baseRef = mergeBase.trim();
  }

  let changedOutput = null;
  for (const range of [`${baseRef}...HEAD`, 'HEAD~1...HEAD']) {
    const output = runGit(['diff', '--name-only', range]);
    if (output && output.trim()) {
      changedOutput = output;
      break;
    }
  }

  if (!changedOutput) {
    changedOutput = runGit(['status', '--porcelain=v1']);
  }

  const changed = new Set();
  if (!changedOutput) {
    return [];
  }

  const lines = changedOutput.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  for (const line of lines) {
    if (line.includes(' -> ')) {
      continue;
    }

    let filePath = '';
    if (/^(?:[MADCRU]\s+|^\?\?)/.test(line)) {
      filePath = normalizeGitPath(line.slice(3));
    } else {
      filePath = normalizeGitPath(line);
    }

    const fullPath = join(ROOT, filePath);
    if (!existsSync(fullPath)) {
      continue;
    }

    changed.add(fullPath);
  }

  return [...changed].sort();
}

function collectTopicFiles() {
  const topicsDir = join(DOCS_ROOT);
  if (!existsSync(topicsDir)) {
    return [];
  }

  const dirs = readdirSync(topicsDir, {withFileTypes: true});
  const readmes = [];
  for (const dir of dirs) {
    if (!dir.isDirectory() || dir.name.startsWith('.')) {
      continue;
    }

    if (dir.name === 'node_modules') {
      continue;
    }

    const readmePath = join(topicsDir, dir.name, 'README.md');
    const testPlanPath = join(topicsDir, dir.name, 'test-plan.md');
    if (existsSync(readmePath)) {
      readmes.push({
        id: dir.name,
        readmePath,
        testPlanPath: existsSync(testPlanPath) ? testPlanPath : null,
      });
    }
  }

  return readmes.sort((a, b) => a.id.localeCompare(b.id));
}

function extractMermaidBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let inBlock = false;
  let startLine = -1;
  let contentLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!inBlock && isMermaidOpen(line)) {
      inBlock = true;
      startLine = i + 1;
      contentLines = [];
      continue;
    }

    if (inBlock) {
      if (isMermaidClose(line)) {
        blocks.push({
          startLine,
          endLine: i + 1,
          content: contentLines.join('\n'),
        });
        inBlock = false;
        startLine = -1;
        contentLines = [];
      } else {
        contentLines.push(line);
      }
    }
  }

  if (inBlock) {
    blocks.push({
      startLine,
      endLine: lines.length,
      content: contentLines.join('\n'),
      unterminated: true,
    });
  }

  return blocks;
}

function findOverviewRange(lines) {
  const overviewRe = /^##\s+Overview\s*$/i;
  const headingRe = /^##\s+/;
  for (let i = 0; i < lines.length; i += 1) {
    if (!overviewRe.test(lines[i])) {
      continue;
    }

    const start = i + 1;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (headingRe.test(lines[j]) && j !== i) {
        end = j + 1;
        break;
      }
    }

    return {start, end};
  }

  return null;
}

function locateKind(diagram) {
  const first = diagram
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('%%'));

  if (!first) {
    return 'unknown';
  }

  return first.split(/\s+/)[0];
}

function countFlowLike(diagram) {
  const nodes = new Set();
  let edges = 0;

  for (const lineRaw of diagram.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('%%')) {
      continue;
    }

    const edgeMatches = line.matchAll(/([A-Za-z_$][\w$.-]*)\s*(?:--\.?|->|-->|<-|<--|<->|\.<\.|\.-|=|==>|-\.|-->?)\s*([A-Za-z_$][\w$.-]*)/g);
    for (const match of edgeMatches) {
      edges += 1;
      nodes.add(match[1]);
      nodes.add(match[2]);
    }

    const nodeDecl = line.match(/^([A-Za-z_$][\w$.-]*)\s*(?:\(|\[|\{|\<)/);
    if (nodeDecl) {
      nodes.add(nodeDecl[1]);
    }
  }

  return {nodes: [...nodes], nodeCount: nodes.size, edgeCount: edges};
}

function countStateDiagram(diagram) {
  const nodes = new Set();
  let edges = 0;

  for (const lineRaw of diagram.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('%%')) {
      continue;
    }

    if (line === '[*]') {
      nodes.add('[*]');
    }

    const decl = line.match(/^state\s+"[^"]+"\s+as\s+([A-Za-z_$][\w$.-]*)/);
    if (decl) {
      nodes.add(decl[1]);
    }

    const edgeRegex = /([A-Za-z_$][\w$.-]*|\[\*\])\s*(?:-->|-->|->|<-|<--|<->|\.|-)\s*([A-Za-z_$][\w$.-]*|\[\*\])/g;
    for (const match of line.matchAll(edgeRegex)) {
      edges += 1;
      nodes.add(match[1]);
      nodes.add(match[2]);
    }
  }

  return {nodes: [...nodes], nodeCount: nodes.size, edgeCount: edges};
}

function countClassDiagram(diagram) {
  const nodes = new Set();
  let edges = 0;

  for (const lineRaw of diagram.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('%%')) {
      continue;
    }

    const decl = line.match(/^class\s+([A-Za-z_$][\w$.-]*)/);
    if (decl) {
      nodes.add(decl[1]);
    }

    const edgeRegex = /([A-Za-z_$][\w$.-]*)\s*(?:<\|--|--\|>|\*--|--\*|-->|<--|o--|--o)\s*([A-Za-z_$][\w$.-]*)/g;
    for (const match of line.matchAll(edgeRegex)) {
      edges += 1;
      nodes.add(match[1]);
      nodes.add(match[2]);
    }
  }

  return {nodes: [...nodes], nodeCount: nodes.size, edgeCount: edges};
}

function countMindMap(diagram) {
  const lines = diagram.split(/\r?\n/);
  const nodes = [];

  for (const lineRaw of lines.slice(1)) {
    const trimmed = lineRaw.trim();
    if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('direction')) {
      continue;
    }

    const indent = lineRaw.match(/^\s*/)?.[0]?.length ?? 0;
    if (trimmed.length > 0 && !/^direction\b/.test(trimmed) && !/^mindmap\b/.test(trimmed)) {
      nodes.push({indent, text: trimmed, parent: -1, level: 0, children: 0});
    }
  }

  if (nodes.length === 0) {
    return {nodeCount: 0, rootCount: 0, roots: [], rootChildren: 0, maxDepth: 0};
  }

  const minIndent = Math.min(...nodes.map((n) => n.indent));
  const roots = nodes.filter((n) => n.indent === minIndent);
  const rootIndex = nodes.findIndex((n) => n.indent === minIndent);
  const stack = [];

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    while (stack.length > 0 && node.indent <= nodes[stack[stack.length - 1]].indent) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      node.parent = parent;
      node.level = nodes[parent].level + 1;
      nodes[parent].children += 1;
    }

    stack.push(i);
  }

  const rootChildren = rootIndex >= 0 ? nodes.filter((n) => n.parent === rootIndex).length : 0;
  const maxDepth = Math.max(...nodes.map((n) => n.level), 0);
  return {
    nodeCount: nodes.length,
    rootCount: roots.length,
    roots: roots.map((n) => n.text),
    rootChildren,
    maxDepth,
  };
}

function parseTopicYamlFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return parseYamlText(raw);
}

function profileFromContent(manifest, frontmatter) {
  const hasTriage = Boolean(manifest.entrypoints?.triage) || frontmatter.raw.includes('entry-triage') || parseAgentEntryQueryIds(frontmatter.raw).includes('triage');
  const hasImpact = Boolean(manifest.entrypoints?.impact) || frontmatter.raw.includes('entry-impact') || parseAgentEntryQueryIds(frontmatter.raw).includes('impact');
  const risk = parseYamlScalar(manifest.risk_level || frontmatter.data.risk_level || 'medium');

  if (manifest.profile) {
    return parseYamlScalar(manifest.profile);
  }

  if (!hasTriage || !hasImpact) {
    return 'reference';
  }

  return risk.toLowerCase() === 'high' ? 'contract' : 'behavior';
}

function normalizeManifestProfile(profile, fallback) {
  const candidate = parseYamlScalar(profile || fallback || '').toLowerCase();
  if (!PROFILE_VALUES.has(candidate)) {
    return fallback || 'reference';
  }
  return candidate;
}

function manifestEntryPoints(manifest, fallbackAnchors) {
  if (manifest.entrypoints && typeof manifest.entrypoints === 'object' && !Array.isArray(manifest.entrypoints)) {
    return {
      onboarding: parseYamlScalar(manifest.entrypoints.onboarding),
      edit: parseYamlScalar(manifest.entrypoints.edit),
      triage: parseYamlScalar(manifest.entrypoints.triage),
      impact: parseYamlScalar(manifest.entrypoints.impact),
    };
  }

  const routes = {};
  for (const route of fallbackAnchors) {
    routes[route] = `README.md#entry-${route}`;
  }
  return routes;
}

function collectTopicManifests() {
  const readmes = collectTopicFiles();
  const entries = [];
  for (const item of readmes) {
    if (!existsSync(item.readmePath)) {
      continue;
    }

    const markdown = readFileSync(item.readmePath, 'utf8');
    const frontmatter = parseSimpleFrontmatter(markdown);
    const manifestPath = join(DOCS_ROOT, item.id, 'topic.yaml');
    const hasManifest = existsSync(manifestPath);
    const manifest = hasManifest ? parseTopicYamlFile(manifestPath) : {};
    const topicId = parseYamlScalar(manifest.id || frontmatter.data.topic || item.id);
    const profile = normalizeManifestProfile(manifest.profile, profileFromContent(manifest, frontmatter));
    const dependsOn = toStringList(manifest.depends_on || frontmatter.data.depends_on);
    const fallbackAnchors = parseAgentEntryQueryIds(frontmatter.raw);
    const entrypoints = manifestEntryPoints(manifest, fallbackAnchors);
    const routeKeys = new Set(Object.entries(entrypoints).filter((entry) => ['onboarding', 'edit', 'triage', 'impact'].includes(entry[0]) && entry[1]).map((entry) => entry[0]));
    const owns = manifest.owns ? toStringList(manifest.owns) : toStringList(frontmatter.data.owns);
    const testPlan = parseYamlScalar(manifest.test_plan || frontmatter.data.test_plan || 'test-plan.md');
    const testPlanPath = join(DOCS_ROOT, topicId, testPlan);

    entries.push({
      id: topicId,
      topic: topicId,
      profile,
      manifestPath,
      hasManifest,
      readmePath: item.readmePath,
      testPlanPath: existsSync(testPlanPath) ? testPlanPath : item.testPlanPath,
      depends_on: dependsOn,
      used_by: [],
      owns,
      owners: toStringList(manifest.owners),
      status: parseYamlScalar(manifest.status || frontmatter.data.status || 'current'),
      documentation_maturity: parseYamlScalar(manifest.documentation_maturity || ''),
      risk_level: parseYamlScalar(manifest.risk_level || frontmatter.data.risk_level || ''),
      lifecycle: parseYamlScalar(manifest.lifecycle || ''),
      test_plan: testPlan,
      entrypoints,
      entrypointKeys: [...routeKeys],
      docsImpact: parseYamlScalar(frontmatter.data['docs-impact']),
      docsImpactRationale: parseYamlScalar(frontmatter.data['docs-impact-rationale']),
      frontmatterRaw: frontmatter.raw,
      frontmatterParsed: frontmatter.data,
      markdown,
    });
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

function validateManifestSchema(topicManifests, mode) {
  const seenIds = new Set();
  const validTopics = new Set(topicManifests.map((topic) => topic.id));

  for (const topic of topicManifests) {
    if (!topic.id) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-ID', 'manifest',
        'Manifest/topic is missing id.',
        'Set id in docs/topics/<topic>/topic.yaml.');
      continue;
    }

    if (seenIds.has(topic.id)) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-ID', 'manifest',
        `Duplicate manifest id ${topic.id}.`,
        'Ensure each topic id is unique.');
      continue;
    }
    seenIds.add(topic.id);

    if (!topic.hasManifest) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-MISSING', 'manifest',
        `Missing canonical manifest topic.yaml for ${topic.id}.`,
        `Create docs/topics/${topic.id}/topic.yaml and migrate required metadata there.`);
    }

    if (!topic.topic || typeof topic.topic !== 'string') {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-MISSING', 'manifest',
        `Manifest missing topic title field for ${topic.id}.`,
        'Set title in docs/topics/<topic>/topic.yaml.');
    }

    if (!PROFILE_VALUES.has(topic.profile)) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-PROFILE', 'manifest',
        `Manifest profile "${topic.profile || ''}" is invalid for ${topic.id}.`,
        'Use reference, behavior, or contract.');
    }

    if (!RISK_VALUES.has(parseYamlScalar(topic.risk_level).toLowerCase())) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-RISK', 'manifest',
        `Manifest risk_level is invalid for ${topic.id}: "${topic.risk_level || '(missing)'}".`,
        'Use low, medium, or high.');
    }

    if (!topic.lifecycle) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-LIFECYCLE', 'manifest',
        `Manifest lifecycle missing for ${topic.id}.`,
        'Set lifecycle to active, deprecated, or retired.');
    }

    const maturity = parseYamlScalar(topic.documentation_maturity).toLowerCase();
    if (topic.documentation_maturity && !DOCUMENTATION_MATURITY_VALUES.has(maturity)) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-MATURITY', 'manifest',
        `Manifest documentation_maturity "${topic.documentation_maturity}" is not draft/current/verified for ${topic.id}.`,
        'Use draft, current, or verified.');
    }

    if (!(topic.owners && topic.owners.length > 0)) {
      record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-OWNER', 'manifest',
        `Manifest owners missing for ${topic.id}.`,
        'Set owners: [<id>] in topic.yaml.');
    }

    const requiresProfileRoutes = topic.profile === 'behavior' || topic.profile === 'contract' ? ['onboarding', 'edit', 'triage', 'impact'] : ['onboarding', 'edit'];
    for (const route of requiresProfileRoutes) {
      if (!topic.entrypoints || !topic.entrypoints[route]) {
        record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-ENTRY', 'manifest',
          `Missing entrypoint "${route}" in ${topic.id} manifest.`,
          `Add entrypoints.${route} in docs/topics/${topic.id}/topic.yaml.`);
      }
    }

    const hasArchitecture = existsSync(join(DOCS_ROOT, topic.id, 'architecture.md'));
    const hasRationale = existsSync(join(DOCS_ROOT, topic.id, 'rationale.md'));
    const topicRisk = parseYamlScalar(topic.risk_level).toLowerCase();
    const requiresDepth = topic.profile === 'contract' || topicRisk === 'high';
    if (requiresDepth) {
      if (!hasArchitecture) {
        record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-ARCHITECTURE', 'manifest',
          `Missing architecture.md for ${topic.id} (${topic.profile}, risk ${topicRisk || 'medium'}).`,
          `Add docs/topics/${topic.id}/architecture.md to explain structure and dataflow.`);
      }
    }

    if (requiresDepth) {
      if (!hasRationale) {
        record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-RATIONALE', 'manifest',
          `Missing rationale.md for ${topic.id} (${topic.profile}, risk ${topicRisk || 'medium'}).`,
          `Add docs/topics/${topic.id}/rationale.md to record tradeoffs and design constraints.`);
      }
    } else if (topic.profile === 'behavior' && hasRationale && hasArchitecture) {
      // no-op; behavior topics may include these artifacts but are not required
    }

    for (const dependency of topic.depends_on || []) {
      if (!dependency) {
        continue;
      }

      if (validTopics.has(dependency)) {
        continue;
      }

      if (/[\\/]/.test(dependency)) {
        record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-DEPENDENCY', 'manifest',
          `Dependency "${dependency}" in ${topic.id} appears to be a source path; move it to owns.`,
          'Use depends_on for topic ids only and owns for source ownership patterns.');
      } else {
        record(mode, 'MANIFEST', topic.readmePath, 1, 'DOCL-MANIFEST-DEPENDENCY', 'manifest',
          `Manifest depends_on "${dependency}" does not match a known topic id in ${topic.id}.`,
          'Use known topic IDs in depends_on (or add the referenced shelf first).');
      }
    }
  }
}

function collectRegistryShelfEntries() {
  const rootReadme = join(DOCS_ROOT, 'README.md');
  if (!existsSync(rootReadme)) {
    return [];
  }

  const markdown = readFileSync(rootReadme, 'utf8');
  const frontmatter = parseSimpleFrontmatter(markdown);
  const lines = frontmatter.raw.split(/\r?\n/);
  const shelves = [];
  let inShelves = false;
  let shelfRootIndent = 0;
  let current = null;
  let currentIndent = 0;
  let listKey = null;
  let hasSeenRootShelves = false;

  for (const rawLine of lines) {
    const shelvesMatch = /^(\s*)shelves:\s*$/i.exec(rawLine);
    if (shelvesMatch) {
      if (shelvesMatch[1].length !== 0) {
        continue;
      }
      inShelves = true;
      shelfRootIndent = 0;
      hasSeenRootShelves = true;
      current = null;
      currentIndent = 0;
      listKey = null;
      continue;
    }

    if (!inShelves) {
      continue;
    }

    const indentation = rawLine.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (!rawLine.trim()) {
      continue;
    }

    if (indentation <= shelfRootIndent) {
      break;
    }

    const listItemMatch = /^(\s*)-\s*id:\s*(.+)\s*$/i.exec(rawLine);
    if (listItemMatch) {
      const itemIndent = listItemMatch[1].length;
      if (itemIndent === shelfRootIndent + 2) {
        current = {
          id: parseYamlScalar(listItemMatch[2]),
          path: '',
          depends_on: [],
          used_by: [],
        };
        currentIndent = itemIndent;
        listKey = null;
        shelves.push(current);
        continue;
      }

      if (current && itemIndent <= currentIndent) {
        current = null;
        listKey = null;
      }
      continue;
    }

    if (!current) {
      continue;
    }

    if (indentation <= currentIndent && rawLine.trim() && !rawLine.trim().startsWith('-')) {
      if (hasSeenRootShelves) {
        break;
      }
      current = null;
      listKey = null;
      continue;
    }

    const listValueMatch = /^(\s*)-\s+(.+)\s*$/i.exec(rawLine);
    if (listValueMatch && listKey) {
      const listIndent = listValueMatch[1].length;
      if (listIndent > currentIndent + 2) {
        current[listKey].push(parseYamlScalar(listValueMatch[2]));
        continue;
      }
    }

    const entryLine = rawLine.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)\s*$/i);
    if (!entryLine) {
      continue;
    }

    const key = entryLine[1];
    const value = parseYamlScalar(entryLine[2]);
    if (key === 'id') {
      continue;
    }
    if (key === 'path') {
      current.path = value;
      listKey = null;
      continue;
    }
    if (key === 'depends_on' || key === 'used_by') {
      current[key] = [];
      listKey = key;
      continue;
    }

    listKey = null;
  }

  return shelves;
}

function parseTestPlanRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\|\s*Requirement\s*\|\s*Contract claim/i.test(line.trim()));
  if (headerIndex < 0) {
    return {rows: [], headerLine: -1};
  }

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) {
      break;
    }

    const cols = line.split('|').map((c) => c.trim()).filter((item, index, array) => !(index === 0 || index === array.length - 1));
    if (cols.length < 6) {
      continue;
    }

    rows.push({
      requirement: cols[0],
      claim: cols[1],
      evidence: cols[2],
      fixture: cols[3],
      oracle: cols[4],
      status: cols[5],
    });
  }

  return {rows, headerLine: headerIndex + 1};
}

function parseRefTarget(reference) {
  const [target, ...rest] = String(reference).split('::');
  return {target: target?.trim(), anchor: rest.join('::').trim() || ''};
}

function validateReferenceFile(fileLike, evidenceColumn, line, owner, errors, mode) {
  const pathLike = toFilePathRef(fileLike || '');
  if (!pathLike || !looksLikeSourcePath(pathLike)) {
    return;
  }

  const base = join(ROOT, pathLike);
  if (!existsSync(base)) {
    errors.push({
      code: `DOCL-${mode}-FILE`,
      parser: 'evidence-parse',
      kind: 'EVIDENCE',
      line,
      desc: `Evidence reference "${evidenceColumn}" points to missing ${owner}: ${pathLike}.`,
      remediation: `Ensure the referenced ${owner} exists in repository or update the evidence anchor.`,
    });
  }
}

function validateReferenceAnchor(pathLike, anchorLike, line, owner, errors) {
  if (!anchorLike) {
    return;
  }

  const filePath = join(ROOT, toFilePathRef(pathLike));
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  const symbolMatch = new RegExp(`\\b${escapeRegex(anchorLike)}\\b`, 'm').test(content);
  if (!symbolMatch) {
    errors.push({
      code: `DOCL-EVIDENCE-ANCHOR`,
      parser: 'evidence-parse',
      kind: 'EVIDENCE',
      line,
      desc: `Evidence ${owner} anchor "${anchorLike}" not found in ${pathLike}.`,
      remediation: 'Use an exact test name or exported symbol that exists in the referenced file.',
    });
  }
}

function extractSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const headingRe = new RegExp(`^##\\s+${escapeRegex(heading)}\\b`, 'i');
  const start = lines.findIndex((line) => headingRe.test(line.trim()));
  if (start < 0) {
    return '';
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  return lines.slice(start + 1, end).join('\n').trim();
}

function estimateMarkdownRows(sectionText) {
  const lines = sectionText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('|'));
  if (!lines.length) {
    return 0;
  }

  const bodyRows = lines.filter((line) => !/^\|\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|$/.test(line)).slice(1);
  return Math.max(0, bodyRows.length);
}

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractRequirementReferences(markdown) {
  const matches = markdown.matchAll(/R-[A-Z0-9-]+-\d+/g);
  const ids = new Set();
  for (const match of matches) {
    ids.add(match[0]);
  }
  return [...ids];
}

function collectEvidenceCoverageErrors(topic, testPlanRows) {
  const result = [];
  if (!testPlanRows.rows.length) {
    result.push({
      code: 'DOCL-EVIDENCE-MISSING',
      parser: 'table-parse',
      kind: 'EVIDENCE',
      line: 1,
      desc: `No requirement table found in ${relative(ROOT, topic.testPlanPath)}.`,
      remediation: 'Add the canonical evidence table with requirement/claim/evidence/oracle columns.',
    });
    return result;
  }

  const reqIds = new Set();
  const idPattern = /^R-[A-Z0-9]+-\d+$/i;
  for (const [index, row] of testPlanRows.rows.entries()) {
    const line = (testPlanRows.headerLine || 1) + 2 + index;
    if (!row.requirement || !row.claim || !row.evidence || !row.fixture || !row.oracle || !row.status) {
      result.push({
        code: 'DOCL-EVIDENCE-ROW',
        parser: 'table-parse',
        kind: 'EVIDENCE',
        line,
        desc: `Incomplete evidence row for ${row.requirement || '(missing id)'} in ${relative(ROOT, topic.testPlanPath)}.`,
        remediation: 'Populate all six columns: requirement, claim, evidence, fixture/input, oracle, status.',
      });
      continue;
    }

    if (!idPattern.test(row.requirement)) {
      result.push({
        code: 'DOCL-EVIDENCE-ID',
        parser: 'table-parse',
        kind: 'EVIDENCE',
        line,
        desc: `Requirement id "${row.requirement}" does not match stable pattern.`,
        remediation: 'Use stable ids like R-AR-1.',
      });
    }

    if (reqIds.has(row.requirement)) {
      result.push({
        code: 'DOCL-EVIDENCE-DUPE',
        parser: 'table-parse',
        kind: 'EVIDENCE',
        line,
        desc: `Duplicate requirement id "${row.requirement}".`,
        remediation: 'Make requirement ids unique within each test-plan.',
      });
    } else {
      reqIds.add(row.requirement);
    }

    for (const evidence of extractEvidenceRefs(row.evidence)) {
      const {target, anchor} = parseRefTarget(evidence);
      const normalized = toFilePathRef(target || '');
      if (!normalized) {
        continue;
      }
      validateReferenceFile(normalized, `Evidence (${topic.id})`, line, 'evidence file', result, 'EVIDENCE');
      validateReferenceAnchor(normalized, anchor, line, `Evidence (${topic.id})`, result);
    }

    for (const fixture of extractEvidenceRefs(row.fixture)) {
      validateReferenceFile(fixture, 'fixture', line, 'fixture path', result, 'EVIDENCE-FIXTURE');
    }

    if (String(row.oracle).toLowerCase().trim() === 'stable' || row.oracle.length < 5) {
      result.push({
        code: 'DOCL-EVIDENCE-ORACLE',
        parser: 'table-parse',
        kind: 'EVIDENCE',
        line,
        desc: `Requirement ${row.requirement} oracle is non-actionable.`,
        remediation: 'Use a concrete oracle (value/invariant/error class/ordering rule).',
      });
    }
  }

  const readmeRefs = extractRequirementReferences(topic.markdown);
  for (const ref of readmeRefs) {
    if (!reqIds.has(ref)) {
      const row = testPlanRows.rows.find((entry) => entry.requirement === ref);
      if (!row) {
        result.push({
          code: 'DOCL-EVIDENCE-ORPHAN',
          parser: 'evidence-map',
          kind: 'EVIDENCE',
          line: 1,
          desc: `README references requirement ${ref}, but no matching row exists in test-plan.`,
          remediation: 'Add the requirement row or remove stale requirement references.',
        });
      }
    }
  }

  return result;
}

function checkOnboardingConstraints(file, block) {
  const kind = locateKind(block.content);
  if (kind === 'mindmap') {
    const metrics = countMindMap(block.content);
    if (metrics.rootCount !== 1) {
      record(1, 'STRUCTURE', file, block.startLine, 'DOCL-ONBOARD-ROOT', 'token-extract',
        `Onboarding mindmap has ${metrics.rootCount} root-level nodes; expected 1.`,
        'Use one explicit root node and attach all children under it.');
      return;
    }

    if (metrics.rootChildren > PASS1_MAX_NODES) {
      record(1, 'STRUCTURE', file, block.startLine, 'DOCL-ONBOARD-NODES', 'token-extract',
        `Onboarding mindmap has ${metrics.rootChildren} children; expected at most ${PASS1_MAX_NODES}.`,
        'Use one root with up to five immediate child branches in onboarding.');
    }

    if (metrics.maxDepth > 1) {
      record(1, 'STRUCTURE', file, block.startLine, 'DOCL-ONBOARD-MINDMAP-DEPTH', 'token-extract',
        `Onboarding mindmap has depth ${metrics.maxDepth}; expected only one nesting level under the root.`,
        'Flatten to a two-level mindmap for the onboarding surface.');

    }
    return;
  }

  let metrics = null;
  if (kind === 'classDiagram') {
    metrics = countClassDiagram(block.content);
  } else if (kind === 'stateDiagram' || kind === 'stateDiagram-v2') {
    metrics = countStateDiagram(block.content);
  } else if (kind.startsWith('flowchart') || kind === 'graph') {
    metrics = countFlowLike(block.content);
  } else if (kind === 'sequenceDiagram') {
    // keep sequence blocks lightweight for onboarding: count participants and arrows heuristically
    const participants = (block.content.match(/participant\s+/g) || []).length;
    const messages = (block.content.match(/->>|->|-->>|-->/g) || []).length;
    metrics = {nodeCount: participants, edgeCount: messages};
  }

  if (!metrics) {
    return;
  }

  if (metrics.nodeCount > PASS1_MAX_NODES) {
    record(1, 'STRUCTURE', file, block.startLine, 'DOCL-ONBOARD-NODES', 'token-extract',
      `Onboarding ${kind} diagram has ${metrics.nodeCount} nodes; max allowed is ${PASS1_MAX_NODES}.`,
      'Collapse to a 5-node macro-level view in onboarding; move detail to section-level diagrams.');
  }

  if (metrics.edgeCount > PASS1_MAX_EDGES) {
    record(1, 'STRUCTURE', file, block.startLine, 'DOCL-ONBOARD-EDGES', 'token-extract',
      `Onboarding ${kind} diagram has ${metrics.edgeCount} edges; max allowed is ${PASS1_MAX_EDGES}.`,
      'Collapse detail in onboarding graph and keep deep transitions for downstream diagrams.');
  }
}

function resolveMmdc() {
  const candidates = [
    {command: join(ROOT, 'node_modules', '.bin', 'mmdc'), args: []},
    {command: 'mmdc', args: []},
    {command: 'npx', args: ['-y', '@mermaid-js/mermaid-cli']},
  ];

  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate.command, [...candidate.args, '-V'], {encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'pipe']});
      if (result.status === 0) {
        return candidate;
      }
    } catch {
      // ignore and try next candidate
    }
  }

  return null;
}

const MMDC_CMD = resolveMmdc();

function mmdcCommand() {
  if (!MMDC_CMD) {
    return null;
  }

  return MMDC_CMD;
}

function checkSyntax(file, block, pass) {
  const mmdc = mmdcCommand();
  if (!mmdc) {
    return {
      ok: false,
      kind: 'SYNTAX',
      code: 'DOCL-MMD-TOOL',
      parser: 'mmdc',
      line: block.startLine,
      message: 'Mermaid CLI (mmdc) unavailable.',
      remediation: 'Install Mermaid CLI (`npm i -D @mermaid-js/mermaid-cli` or `npx -y @mermaid-js/mermaid-cli`) and rerun docs verification.',
    };
  }

  const tmpDir = mkdtempSync(join(tmpdir(), `warp-docs-mermaid-pass-${pass}-`));
  const inFile = join(tmpDir, 'in.mmd');
  const outFile = join(tmpDir, 'out.svg');
  writeFileSync(inFile, block.content);

  const result = spawnSync(mmdc.command, [...mmdc.args, '-i', inFile, '-o', outFile], {
    encoding: 'utf8',
    timeout: 12000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  rmSync(tmpDir, {recursive: true, force: true});

  if (result.status === 0) {
    return {ok: true};
  }

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const parseLineMatch = /(?:line|Line)\s+(\d+)/.exec(output);
  const parsedLine = parseLineMatch ? parseIntArgLine(parseLineMatch[1]) : 1;

  const shortMsg = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.toLowerCase().includes('error') || l.toLowerCase().includes('parse')) ||
    'Mermaid parser failure';

  return {
    ok: false,
    kind: 'SYNTAX',
    code: 'DOCL-MMD',
    parser: 'mmdc',
    line: block.startLine + Math.max(parsedLine - 1, 0),
    message: shortMsg,
    remediation: 'Fix Mermaid syntax and rerun docs verification.',
  };
}

function locateOnboardingBlock(blocks, overview) {
  if (blocks.length === 0) {
    return -1;
  }

  if (overview) {
    const fromOverview = blocks.findIndex((block) => block.startLine > overview.start && block.startLine < overview.end);
    if (fromOverview >= 0) {
      return fromOverview;
    }
    return -1;
  }

  return 0;
}

function runPass1(file, blocks, overview, mode = 'legacy') {
  if (mode === 'legacy' && !overview) {
    const line = blocks[0]?.startLine ?? 1;
    record(1, 'STRUCTURE', file, line, 'DOCL-OVERVIEW-MISSING', 'token-extract',
      'README is missing ## Overview section.',
      'Add ## Overview as the opening prose section before any other section.');
  }

  if (blocks.length === 0) {
    if (mode === 'legacy') {
      const line = overview ? overview.start : 1;
      record(1, 'STRUCTURE', file, line, 'DOCL-ONBOARDING-MISSING', 'token-extract',
        'No Mermaid diagram found in ## Overview.',
        'Place a macro-level onboarding diagram in ## Overview.');
    }

    return;
  }

  const onboardingIndex = mode === 'legacy' ? locateOnboardingBlock(blocks, overview) : -1;
  const onboardingBlock = blocks[onboardingIndex];

  if (mode === 'legacy' && (!onboardingBlock || onboardingIndex < 0)) {
    record(1, 'STRUCTURE', file, blocks[0].startLine, 'DOCL-ONBOARDING-MISSING', 'token-extract',
      'No Mermaid diagram found in ## Overview.',
      'Place a macro-level onboarding diagram in ## Overview.');
    return;
  }

  if (mode === 'legacy' && onboardingBlock.unterminated) {
    record(1, 'STRUCTURE', file, onboardingBlock.startLine, 'DOCL-MERMAID-BLOCK', 'token-extract',
      'Mermaid block is unterminated in markdown.',
      'Close the block with a trailing ``` line.');
  }

  if (mode === 'legacy') {
    checkOnboardingConstraints(file, onboardingBlock);
  }

  for (const block of blocks) {
    const syntax = checkSyntax(file, block, 1);
    if (!syntax.ok) {
      record(1, syntax.kind, file, syntax.line, syntax.code, syntax.parser,
        syntax.message, syntax.remediation);
    }
  }
}

function runPass2(file, blocks, overview, mode = 'legacy') {
  if (mode === 'check') {
    return;
  }

  if (blocks.length === 0) {
    return;
  }

  const onboardingIndex = locateOnboardingBlock(blocks, overview);
  const skip = onboardingIndex >= 0 ? onboardingIndex : -1;
  for (let i = 0; i < blocks.length; i += 1) {
    if (i === skip) {
      continue;
    }

    const block = blocks[i];
    if (block.unterminated) {
      record(2, 'STRUCTURE', file, block.startLine, 'DOCL-MERMAID-BLOCK', 'token-extract',
        'Mermaid block is unterminated in markdown.',
        'Close the block with a trailing ``` line.');
      continue;
    }

    const syntax = checkSyntax(file, block, 2);
    if (!syntax.ok) {
      record(2, syntax.kind, file, syntax.line, syntax.code, syntax.parser, syntax.message, syntax.remediation);
    }
  }
}

function checkReadmeContracts(file, mode, topic) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const frontmatter = parseSimpleFrontmatter(content);

  if (!frontmatter.hasFrontmatter) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-FM-MISSING', 'frontmatter', 'README is missing frontmatter block.',
      'Add frontmatter metadata for topic id and links.');
    return null;
  }

  const topicId = parseYamlScalar(topic?.id || frontmatter.data.topic || frontmatter.data.id || '');
  if (!topicId) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-TOPIC-ID', 'frontmatter', 'README frontmatter must include topic/id.',
      'Add topic: <topic-id>.');
  }

  const queryAnchors = new Set(topic?.entrypointKeys || parseAgentEntryQueryIds(frontmatter.raw));
  const markdownHas = (search) => search.test(content);
  const headingLines = {
    'At a glance': /##\s+At a glance/i,
    'Safe change path': /##\s+Safe change path/i,
    'Failure modes': /##\s+Failure modes/i,
    'Dependencies and impact': /##\s+Dependencies and impact/i,
    'Evidence': /##\s+Evidence/i,
  };

  if (!markdownHas(headingLines['At a glance'])) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-SECTION-MISSING', 'markdown', 'Missing At a glance section.',
      'Add `## At a glance` near onboarding entry point.');
  }

  if (!markdownHas(headingLines['Safe change path'])) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-SECTION-MISSING', 'markdown', 'Missing Safe change path section.',
      'Add `## Safe change path` for edits and verification guidance.');
  }

  if (!markdownHas(headingLines['Failure modes']) && queryAnchors.has('triage')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-SECTION-MISSING', 'markdown', 'Missing Failure modes section for triage profile.',
      'Add `## Failure modes` when triage is an enabled entrypoint.');
  }

  if (!markdownHas(headingLines['Dependencies and impact']) && queryAnchors.has('impact')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-SECTION-MISSING', 'markdown', 'Missing Dependencies and impact section for impact profile.',
      'Add `## Dependencies and impact` when impact is an enabled entrypoint.');
  }

  if (!markdownHas(headingLines['Evidence'])) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-SECTION-MISSING', 'markdown', 'Missing Evidence section.',
      'Add `## Evidence` with explicit test and oracle guidance.');
  }

  const testPlan = parseYamlScalar(topic?.test_plan || frontmatter.data.test_plan || 'test-plan.md');
  const testPlanPath = join(DOCS_ROOT, topicId || '', testPlan);
  if (!existsSync(testPlanPath)) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-TESTPLAN-MISSING', 'file-resolve', `test-plan ${testPlan} missing for ${topicId || 'topic'}.`,
      'Add a topic test-plan.md matching the evidence contract map.');
  }

  if (queryAnchors.has('triage') && !content.includes('<a id="entry-triage"></a>')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-ENTRY-TRIAGE', 'markdown', 'Entry has triage route but missing anchor.',
      'Add `<a id="entry-triage"></a>` before Failure modes section.');
  }

  if (queryAnchors.has('impact') && !content.includes('<a id="entry-impact"></a>')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-ENTRY-IMPACT', 'markdown', 'Entry has impact route but missing anchor.',
      'Add `<a id="entry-impact"></a>` before Dependencies and impact.');
  }

  if (!content.includes('<a id="entry-onboarding"></a>')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-ENTRY-ONBOARDING', 'markdown', 'Missing onboarding entry anchor.',
      'Add `<a id="entry-onboarding"></a>` before At a glance.');
  }

  if (!content.includes('<a id="entry-edit"></a>')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-ENTRY-EDIT', 'markdown', 'Missing edit entry anchor.',
      'Add `<a id="entry-edit"></a>` before Safe change path.');
  }

  if (topic?.profile === 'reference' && queryAnchors.has('triage')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-PROFILE-CONFLICT', 'manifest',
      `Reference profile for ${topicId} should not declare triage entrypoint without rationale.`,
      'Use behavior/contract profile or remove triage route.');
  }

  if (topic?.profile === 'reference' && queryAnchors.has('impact')) {
    record(mode, 'STRUCTURE', file, 1, 'DOCL-PROFILE-CONFLICT', 'manifest',
      `Reference profile for ${topicId} should not declare impact entrypoint by default.`,
      'Use behavior/contract profile or remove impact route.');
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const linkMatch = line.match(/\[[^\]]+\]\(([^)\s]+)\)/g);
    if (!linkMatch) {
      continue;
    }

    for (const link of linkMatch) {
      const target = link.match(/\[[^\]]+\]\(([^)\s]+)\)/)?.[1];
      if (!target || target.startsWith('http') || target.startsWith('mailto:') || target.startsWith('#')) {
        continue;
      }

      const cleaned = target.split('#')[0];
      let relTarget = cleaned;
      if (cleaned.startsWith('../') || cleaned.startsWith('./')) {
        relTarget = resolve(dirname(file), cleaned);
      } else if (cleaned.startsWith('/')) {
        relTarget = join(ROOT, cleaned);
      } else {
        relTarget = resolve(dirname(file), cleaned);
      }

      relTarget = resolve(relTarget);
      if (!existsSync(relTarget)) {
        record(mode, 'LINK', file, lineIndex + 1, 'DOCL-LINK-MISSING', 'fs',
          `Broken markdown link target "${target}".`,
          'Point links to existing files or anchors.');
      }
    }
  }

  return {
    id: topicId,
    frontmatter,
    hasOnboardingAnchor: content.includes('<a id="entry-onboarding"></a>'),
    hasEditAnchor: content.includes('<a id="entry-edit"></a>'),
    hasTriageAnchor: content.includes('<a id="entry-triage"></a>'),
    hasImpactAnchor: content.includes('<a id="entry-impact"></a>'),
    queryAnchors,
    testPlanPath,
  };
}

function validateRegistry(topicManifests) {
  const registry = collectRegistryShelfEntries();
  if (!registry.length) {
    record('check', 'STRUCTURE', join(DOCS_ROOT, 'README.md'), 1, 'DOCL-REG-MISSING', 'frontmatter',
      'docs/topics/README.md missing shelves section.', 'Add shelves index entries for each topic shelf.');
    return;
  }

  const registryIds = new Set();
  const manifestIds = new Set(topicManifests.map((topic) => topic.id));

  for (const item of registry) {
    if (registryIds.has(item.id)) {
      record('check', 'STRUCTURE', join(DOCS_ROOT, 'README.md'), 1, 'DOCL-REG-DUP-ID', 'frontmatter',
        `Duplicate registry shelf id ${item.id}.`, 'Deduplicate shelf records.');
      continue;
    }

    registryIds.add(item.id);

    const readmePath = join(DOCS_ROOT, item.path);
    if (!existsSync(readmePath)) {
      record('check', 'STRUCTURE', join(DOCS_ROOT, 'README.md'), 1, 'DOCL-REG-MISSING-READMEs', 'file-resolve',
        `Registry entry ${item.id} points to missing README path ${item.path}.`, 'Fix path or create missing shelf file.');
    }

    for (const dep of toStringList(item.depends_on)) {
      if (!manifestIds.has(dep) && dep !== '') {
        record('check', 'STRUCTURE', join(DOCS_ROOT, 'README.md'), 1, 'DOCL-REG-UNKNOWN-DEP', 'frontmatter',
          `Registry entry ${item.id} depends_on unknown shelf ${dep}.`, 'Fix shelf id or remove broken edge.');
      }
    }

    for (const usedBy of toStringList(item.used_by)) {
      if (!manifestIds.has(usedBy) && usedBy !== '') {
        record('check', 'STRUCTURE', join(DOCS_ROOT, 'README.md'), 1, 'DOCL-REG-UNKNOWN-USED-BY', 'frontmatter',
          `Registry entry ${item.id} references unknown used_by shelf ${usedBy}.`,
          'Fix the used_by shelf id or remove broken edge.');
      }
    }
  }

  for (const topic of topicManifests) {
    if (!registryIds.has(topic.id)) {
      record('check', 'STRUCTURE', topic.readmePath, 1, 'DOCL-REG-MISSING', 'frontmatter',
        `Shelf ${topic.id} exists in docs/topics but not in docs/topics/README registry list.`,
        'Add shelf record in docs/topics/README.md.');
    }
  }
}

function collectEvidenceFromMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const sourceLines = [];
  for (const line of lines) {
    const fileMatches = line.matchAll(/\b[a-zA-Z0-9._/-]+\.(?:ts|tsx|js|mjs|json|yaml|yml|md)\b/g);
    for (const match of fileMatches) {
      const token = match[0];
      if (token.includes('/') || token.startsWith('.') || token.startsWith('src/') || token.startsWith('test/')) {
        sourceLines.push(token.replace(/`/g, '').trim());
      }
    }
  }
  return sourceLines;
}

function runEvidenceMode(topicManifests) {
  validateManifestSchema(topicManifests, 'evidence');
  const changed = DOCS_SCOPE === 'changed' ? new Set(collectChangedMarkdownFiles().map((file) => file)) : null;
  const targets = DOCS_SCOPE === 'changed'
    ? topicManifests.filter((topic) => changed.has(topic.readmePath) || (topic.testPlanPath && changed.has(topic.testPlanPath)))
    : topicManifests;

  for (const topic of targets) {
    if (!topic.testPlanPath) {
      continue;
    }
    if (!existsSync(topic.testPlanPath)) {
      record('evidence', 'EVIDENCE', topic.readmePath, 1, 'DOCL-EVIDENCE-MISSING', 'file-resolve',
        `Missing test-plan for topic ${topic.id}.`, 'Create test-plan.md before merge.');
      continue;
    }

    const planContent = readFileSync(topic.testPlanPath, 'utf8');
    const table = parseTestPlanRows(planContent);
    const errors = collectEvidenceCoverageErrors(topic, table);
    for (const error of errors) {
      record('evidence', error.kind, topic.readmePath, error.line, error.code, error.parser, error.desc, error.remediation);
    }
  }
}

function runCheckMode(topicManifests) {
  validateManifestSchema(topicManifests, 'check');
  const files = DOCS_SCOPE === 'changed'
    ? collectChangedMarkdownFiles()
    : collectMarkdownFiles(DOCS_ROOT);
  const topicByReadme = new Map(topicManifests.map((topic) => [topic.readmePath, topic]));

  for (const file of files) {
    const markdown = readFileSync(file, 'utf8');
    const lines = markdown.split(/\r?\n/);
    const blocks = extractMermaidBlocks(markdown);
    const overview = findOverviewRange(lines);

    runPass1(file, blocks, overview, 'check');
    runPass2(file, blocks, overview, 'check');

    if (file.endsWith('README.md') && !file.endsWith('docs/topics/README.md')) {
      checkReadmeContracts(file, 'check', topicByReadme.get(file));
    }
  }

  validateRegistry(topicManifests);
}

function collectSourceSignalsFromTopic(topic) {
  const sources = new Set();
  const sourceRefs = collectEvidenceFromMarkdown(topic.markdown || '');
  for (const source of sourceRefs) {
    if (source.includes('.ts') || source.includes('.tsx') || source.includes('.js') || source.includes('.mjs')) {
      sources.add(source.replace(/`/g, ''));
    }
  }

  if (topic.testPlanPath && existsSync(topic.testPlanPath)) {
    const plan = readFileSync(topic.testPlanPath, 'utf8');
    for (const source of collectEvidenceFromMarkdown(plan)) {
      if (source.includes('.ts') || source.includes('.tsx') || source.includes('.js') || source.includes('.mjs')) {
        sources.add(source.replace(/`/g, ''));
      }
    }
  }

  return [...sources];
}

function runImpactMode(topicManifests) {
  validateManifestSchema(topicManifests, 'impact');
  const changed = collectChangedFiles().filter((path) => {
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    return !rel.startsWith('docs/topics/');
  });

  const sourceToTopic = new Map();

  for (const topic of topicManifests) {
    const ownershipSignals = (topic.owns && topic.owns.length > 0)
      ? topic.owns
      : collectSourceSignalsFromTopic(topic);

    for (const path of ownershipSignals) {
      const normalized = normalizePosixPath(path);
      if (!normalized) {
        continue;
      }

      const existing = sourceToTopic.get(normalized) || [];
      if (!existing.includes(topic.id)) {
        existing.push(topic.id);
      }
      sourceToTopic.set(normalized, existing);
    }
  }

  const owning = new Set();
  for (const changedPath of changed) {
    const relChanged = normalizePosixPath(relative(ROOT, changedPath));
    let matched = false;
    for (const [path, owners] of sourceToTopic.entries()) {
      if (pathPatternMatch(relChanged, path)) {
        matched = true;
        for (const owner of owners) {
          owning.add(owner);
        }
      }
    }

    if (!matched) {
      record('impact', 'IMPACT', changedPath, 1, 'DOCL-IMPACT-OWNERSHIP-GAP', 'impact-map',
        `Changed source file ${relChanged} is not mapped to a topic ownership source list.`,
        'Add source ownership signal in the owning topic Evidence/source mapping.');
    }
  }

  const reverseDepends = new Map();
  for (const topic of topicManifests) {
    for (const dep of topic.depends_on || []) {
      if (!reverseDepends.has(dep)) {
        reverseDepends.set(dep, []);
      }
      reverseDepends.get(dep).push(topic.id);
    }
  }

  const impacted = new Set(owning);
  const queue = [...owning];
  while (queue.length > 0) {
    const current = queue.shift();
    const dependents = reverseDepends.get(current) || [];
    for (const child of dependents) {
      if (!impacted.has(child)) {
        impacted.add(child);
        queue.push(child);
      }
    }
  }

  if (impacted.size === 0 && changed.length > 0) {
    return;
  }

  const touched = new Set(DOCS_SCOPE === 'changed' ? collectChangedMarkdownFiles() : []);
  for (const topicId of impacted) {
    const topic = topicManifests.find((entry) => entry.id === topicId);
    if (!topic) {
      continue;
    }

    const docsImpact = String(topic.docsImpact || '').toLowerCase();
    if (DOCS_SCOPE === 'changed' && !touched.has(topic.readmePath) && !touched.has(topic.testPlanPath)) {
      if (docsImpact === 'none') {
        if (!topic.docsImpactRationale) {
          record('impact', 'IMPACT', topic.readmePath, 1, 'DOCL-IMPACT-NO-RATIONALE', 'impact-map',
            `Topic ${topic.id} declares docs-impact:none without rationale.`,
            'Add docs-impact-rationale with a short reasoning and scope for the exception.');
        }
      } else {
        record('impact', 'IMPACT', topic.readmePath, 1, 'DOCL-IMPACT-NO-EVIDENCE', 'impact-map',
          `Impact set includes ${topic.id} but no README/test-plan change is present.`,
          'Either update docs for impacted shelves or add explicit docs-impact:none with rationale.');
      }
    }
  }

  console.log('DOC-LOAD[IMPACT] [summary] affected topics:', [...impacted].sort().join(', ') || '(none)');
  if (DOCS_SCOPE === 'changed') {
    const changedSourceCount = changed.length;
    console.log(`DOC-LOAD[IMPACT] [summary] changed sources: ${changedSourceCount}`);
  }
}

function runEvalMode(topicManifests) {
  const files = DOCS_SCOPE === 'changed'
    ? collectChangedMarkdownFiles()
    : collectMarkdownFiles(DOCS_ROOT);

  for (const topic of topicManifests) {
    if (topic.readmePath && !files.includes(topic.readmePath) && DOCS_SCOPE === 'changed') {
      continue;
    }

    const content = topic.markdown || '';
    const structure = checkReadmeContracts(topic.readmePath, 'eval', topic);
    const topicRisk = parseYamlScalar(topic.risk_level).toLowerCase();
    const atAGlance = extractSection(content, 'At a glance');
    const safeChange = extractSection(content, 'Safe change path');
    const failureSection = extractSection(content, 'Failure modes');
    const impactSection = extractSection(content, 'Dependencies and impact');
    const evidenceSection = extractSection(content, 'Evidence');

    const hasAtAGlance = /##\s+At a glance/i.test(content);
    const hasSafeEdit = /##\s+Safe change path/i.test(content);
    const hasFailure = /##\s+Failure modes/i.test(content);
    const hasEvidence = /##\s+Evidence/i.test(content);
    const hasImpact = /##\s+Dependencies and impact/i.test(content);

    if (!hasAtAGlance || !hasSafeEdit || !hasEvidence) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-SECTION', 'task-eval',
        `Readability route for ${topic.id} is likely incomplete for task entry.`,
        'Ensure onboarding/edit/evidence sections are present for focused retrieval.');
    }

    if (!structure) {
      continue;
    }

    const lineCount = atAGlance.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
    if (lineCount < MIN_A_GLANCE_LINES) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-AT-A-GLANCE', 'task-eval',
        `At a glance for ${topic.id} is shorter than the minimum operational orientation depth.`,
        'Add ownership, out-of-scope, prerequisite, and ownership-boundary details.');
    }

    if (!/(what this topic owns|topic owns|owns:|ownership|owns\b)/i.test(atAGlance)) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-OWNERSHIP', 'task-eval',
        `At a glance for ${topic.id} does not state what is owned by the topic.`,
        'Add explicit ownership scope in the onboarding section.');
    }

    if (!/(how (?:this|it) (?:works|behaves)|data flow|state flow|flow summary|flow path|message|event|emit|route|sync|propagat|dispatch|sequence|->|→)/i.test(atAGlance)) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-MECHANISM', 'task-eval',
        `At a glance for ${topic.id} does not include a short mechanism summary.`,
        'Add one sentence describing what changes propagate through this topic and why.');
    }

    if (!/(out of scope|does\s+\*?not\*?\s+own|doesn't own|outside scope|not own)/i.test(atAGlance)) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-BORDER', 'task-eval',
        `At a glance for ${topic.id} does not define a clear boundary.`,
        'State what this topic does not own.');
    }

    if (!/(first prerequisite|prerequisite|before|understand|assumption)/i.test(atAGlance)) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-PREREQ', 'task-eval',
        `At a glance for ${topic.id} does not identify an entry prerequisite.`,
        'Add a prerequisite line for onboarding readers.');
    }

    if (!safeChange) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-SAFE-CHANGE', 'task-eval',
        `Safe change section is too short or empty for ${topic.id}.`,
        'Provide a minimal edit recipe plus a focused verification command.');
    } else if (!/npm run|cargo xtask|npx|npm test|npm run test|tsc --noEmit|lint|lint:check/i.test(safeChange)) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-VERIFY-CMD', 'task-eval',
        `Safe change section for ${topic.id} has no concrete verification command.`,
        'Add focused and full verification commands.');
    } else if (!/1\.\s|Step\s+1|Update|edit|Run|Execute/i.test(safeChange)) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-CHANGE-PLAN', 'task-eval',
        `Safe change section for ${topic.id} is not laid out as an actionable sequence.`,
        'Use numbered or clearly separated steps for safe edits.');
    }

    if (topic.depends_on && topic.depends_on.length > 0 && !hasFailure) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-FAILURE', 'task-eval',
        `Topic ${topic.id} has dependencies but no failure mode table.`,
        'Failure paths are needed for operator triage tasks.');
    } else if (hasFailure && estimateMarkdownRows(failureSection) < 2) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-FAILURE', 'task-eval',
        `Failure modes table for ${topic.id} is too small to be useful.`,
        'Provide at least two concrete failure rows with detection and first response.');
    }

    if (!hasEvidence) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-EVIDENCE', 'task-eval',
        `Evidence section is missing for ${topic.id}.`,
        'Add the Evidence section and point to the relevant requirement rows and verification targets.');
    } else {
      if (!/(R-[A-Z0-9]+-\d+)/.test(evidenceSection)) {
        record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-EVIDENCE-ID', 'task-eval',
          `Evidence section for ${topic.id} does not map to requirement IDs.`,
          'Reference stable requirement IDs from test-plan.md in the Evidence section.');
      }

      if (!/(src\/|test\/|\.\.\/|\.\/)/i.test(evidenceSection)) {
        record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-EVIDENCE-SOURCES', 'task-eval',
          `Evidence section for ${topic.id} does not name executable sources or fixtures.`,
          'Add source/test file references that operators can open directly.');
      }
    }

    if (topic.profile === 'contract' || topicRisk === 'high') {
      const topicDir = dirname(topic.readmePath);
      const hasArchitecture = existsSync(join(topicDir, 'architecture.md'));
      const hasRationale = existsSync(join(topicDir, 'rationale.md'));
      if (!hasArchitecture) {
        record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-ARCHITECTURE', 'task-eval',
          `Contract/high-risk topic ${topic.id} has no architecture.md for impact-oriented readers.`,
          'Add architecture.md for structural comprehension.');
      }
      if (!hasRationale) {
        record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-RATIONALE', 'task-eval',
          `Contract/high-risk topic ${topic.id} has no rationale.md for decision-history context.`,
          'Add rationale.md with tradeoffs and non-goals.');
      }
    } else if (topic.profile === 'behavior') {
      const topicDir = dirname(topic.readmePath);
      const hasArchitecture = existsSync(join(topicDir, 'architecture.md'));
      if (hasArchitecture && !/architecture\.md/i.test(content)) {
        record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-ARCHITECTURE-INDEX', 'task-eval',
          `Behavior topic ${topic.id} has architecture.md but README does not reference it.`,
          'Add a pointer to architecture.md from onboarding, edit, or impact routes.');
      }
    }

    if (hasImpact && !(/Depends on:/i.test(impactSection) || /\|\s*Depends on\s*\|/i.test(impactSection))) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-IMPACT-DEPENDENCIES', 'task-eval',
        `Impact section for ${topic.id} does not list direct dependencies in a stable format.`,
        'Use a stable dependency section with `Depends on` and `Used by`.'
      );
    }

    if (topic.profile !== 'reference' && structure.hasImpactAnchor && !(/Used by:/i.test(impactSection) || /\|\s*Used by\s*\|/i.test(impactSection)) && topic.depends_on && topic.depends_on.length > 0) {
      record('eval', 'ADVISORY', topic.readmePath, 1, 'DOCS-EVAL-IMPACT-USEDBY', 'task-eval',
        `Impact section for ${topic.id} omits downstream consumers.`,
        'Add a `Used by` row so impact readers know blast radius.');
    }
  }
}

function runFile(file, mode) {
  const markdown = readFileSync(file, 'utf8');
  const lines = markdown.split(/\r?\n/);
  const blocks = extractMermaidBlocks(markdown);
  const overview = findOverviewRange(lines);

  if (mode === 'pass1') {
    runPass1(file, blocks, overview);
    return;
  }

  if (mode === 'pass2') {
    runPass2(file, blocks, overview);
    return;
  }

  runPass1(file, blocks, overview);
  runPass2(file, blocks, overview);
}

function runSummary() {
  const normalizedMode = VERIFIER_MODE === 'legacy' ? PASS_MODE : VERIFIER_MODE;
  const isLegacy = VERIFIER_MODE === 'legacy';

  const relevant = isLegacy ? violations.filter((v) => (
    normalizedMode === 'pass1' ? v.pass === 'PASS-1' : normalizedMode === 'pass2' ? v.pass === 'PASS-2' : true
  )) : violations;

  const pass1 = violations.filter((v) => v.pass === 'PASS-1');
  const pass2 = violations.filter((v) => v.pass === 'PASS-2');
  const p1Struct = pass1.filter((v) => v.kind === 'STRUCTURE').length;
  const p1Syntax = pass1.filter((v) => v.kind === 'SYNTAX').length;
  const p2Struct = pass2.filter((v) => v.kind === 'STRUCTURE').length;
  const p2Syntax = pass2.filter((v) => v.kind === 'SYNTAX').length;

  console.log('DOC-LOAD SUMMARY');
  if (isLegacy) {
    console.log(`failed: ${relevant.length}`);
    console.log(`pass-1: ${pass1.length} (${p1Struct} structural, ${p1Syntax} syntax)`);
    console.log(`pass-2: ${pass2.length} (${p2Struct} parser, ${p2Syntax} syntax)`);
    console.log(`status: ${relevant.length ? 'BLOCKED (cognitive-load gate)' : 'PASS'}`);
    return;
  }

  console.log(`failed: ${relevant.length}`);
  const byKind = violations.reduce((acc, violation) => {
    acc[violation.kind] = (acc[violation.kind] || 0) + 1;
    return acc;
  }, {});
  const kindParts = Object.entries(byKind).map(([kind, count]) => `${kind}: ${count}`).join(', ');
  const byMode = violations.reduce((acc, violation) => {
    acc[violation.mode] = (acc[violation.mode] || 0) + 1;
    return acc;
  }, {});
  const modeParts = Object.entries(byMode).map(([kind, count]) => `${kind}: ${count}`).join(', ');
  if (modeParts) {
    console.log(`modes: ${modeParts}`);
  } else {
    console.log('modes: none');
  }
  console.log(`checks: ${kindParts || 'none'}`);
  if (VERIFIER_MODE === 'eval') {
    if (STRICT_NO_WARNINGS && relevant.length > 0) {
      console.log(`status: BLOCKED (strict: no_warnings=${STRICT_NO_WARNINGS})`);
    } else {
      console.log('status: REVIEW');
    }
  } else {
    console.log(`status: ${relevant.length ? 'BLOCKED' : 'PASS'}`);
  }
}

function resetReportFile() {
  writeFileSync(REPORT_FILE, '', {encoding: 'utf8'});
}

function main() {
  resetReportFile();

  if (!existsSync(DOCS_ROOT)) {
    console.log('DOC-LOAD PASS 0: no docs/topics directory found');
    console.log('DOC-LOAD SUMMARY');
    console.log('failed: 0');
    console.log('pass-1: 0 (0 structural, 0 syntax)');
    console.log('pass-2: 0 (0 parser, 0 syntax)');
    console.log('status: PASS');
    return;
  }

  const topicManifests = collectTopicManifests();

  if (VERIFIER_MODE === 'legacy') {
    const files = DOCS_SCOPE === 'changed'
      ? collectChangedMarkdownFiles()
      : collectMarkdownFiles(DOCS_ROOT);
    for (const file of files) {
      runFile(file, PASS_MODE);
    }
  } else if (VERIFIER_MODE === 'check') {
    runCheckMode(topicManifests);
  } else if (VERIFIER_MODE === 'evidence') {
    runEvidenceMode(topicManifests);
  } else if (VERIFIER_MODE === 'impact') {
    runImpactMode(topicManifests);
  } else if (VERIFIER_MODE === 'eval') {
    runEvalMode(topicManifests);
  }

  runSummary();

  if (violations.some((v) => v.code === 'DOCL-MMD-TOOL')) {
    process.exit(12);
  }

  if (VERIFIER_MODE === 'legacy' && (PASS_MODE === 'both' || PASS_MODE === 'pass1')) {
    if (violations.some((v) => v.pass === 'PASS-1')) {
      process.exit(10);
    }
  }

  if (VERIFIER_MODE === 'legacy' && (PASS_MODE === 'both' || PASS_MODE === 'pass2')) {
    if (violations.some((v) => v.pass === 'PASS-2')) {
      process.exit(11);
    }
  }

  if (VERIFIER_MODE === 'check' && violations.length > 0) {
    process.exit(10);
  }

  if (VERIFIER_MODE === 'evidence' && violations.some((v) => v.kind === 'EVIDENCE')) {
    process.exit(11);
  }

  if (VERIFIER_MODE === 'impact' && violations.some((v) => v.kind === 'IMPACT')) {
    process.exit(10);
  }

  if (VERIFIER_MODE === 'eval' && STRICT_NO_WARNINGS && violations.length > 0) {
    process.exit(10);
  }
}

main();
