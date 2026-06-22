#!/usr/bin/env node

import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

const ROOT = resolve('.');
const DOCS_ROOT = join(ROOT, 'docs', 'topics');
const REPORT_FILE = join(ROOT, '.docs-report.jsonl');

const PASS1_MAX_NODES = 5;
const PASS1_MAX_EDGES = 5;

const PASS_MODE = (() => {
  const rawArgs = process.argv.slice(2);
  const inline = rawArgs.find((arg) => arg.startsWith('--pass='));
  const spaced = rawArgs.find((arg) => arg === '--pass');
  const value = (inline ? inline.split('=', 2)[1] : spaced ? rawArgs[rawArgs.indexOf(spaced) + 1] : null) ?? 'both';

  if (!value) {
    return 'both';
  }

  const normalized = value.toLowerCase();
  if (['1', 'pass1', 'onboarding'].includes(normalized)) {
    return 'pass1';
  }

  if (['2', 'pass2', 'deep', 'deep-validation', 'remaining'].includes(normalized)) {
    return 'pass2';
  }

  if (normalized === 'both') {
    return 'both';
  }

  console.error(`DOC-LOAD: unknown pass "${value}". Use --pass=both, --pass=1, or --pass=2.`);
  process.exit(2);
})();

const violations = [];

function parseIntArgLine(line) {
  const parsed = Number.parseInt(line, 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

function escapeQuotes(input) {
  return String(input ?? '').replaceAll('"', '\\"');
}

function appendReportRecord(entry) {
  writeFileSync(REPORT_FILE, `${JSON.stringify(entry)}\n`, {flag: 'a'});
}

function record(pass, kind, file, line, code, parser, desc, remediation) {
  const relFile = relative(ROOT, file);
  const lineText = `DOC-LOAD[PASS-${pass}][${kind}] ${relFile}:${line}:1 code=${code} parser=${parser} desc="${escapeQuotes(desc)}" remediation="${escapeQuotes(remediation)}"`;

  const entry = {
    type: 'DOC-LOAD',
    pass,
    kind,
    file: relFile,
    line,
    code,
    parser,
    desc,
    remediation,
  };

  violations.push(entry);
  appendReportRecord(entry);
  console.log(lineText);

  if (process.env.GITHUB_ACTIONS === 'true') {
    const annotationTitle = kind === 'STRUCTURE'
      ? `DOC-LOAD(PASS-${pass}): Cognitive-load guardrail failed`
      : `DOC-LOAD(PASS-${pass}): Mermaid parse failed`;
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
    if (/^\S/.test(lineRaw)) {
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
    join(ROOT, 'node_modules', '.bin', 'mmdc'),
    'mmdc',
  ];

  for (const command of candidates) {
    try {
      const result = spawnSync(command, ['-v'], {encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'pipe']});
      if (result.status === 0) {
        return command;
      }
    } catch {
      // ignore and try next candidate
    }
  }

  return null;
}

const MMDC_CMD = resolveMmdc();

function checkSyntax(file, block, pass) {
  if (!MMDC_CMD) {
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

  const result = spawnSync(MMDC_CMD, ['-i', inFile, '-o', outFile], {
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

function runPass1(file, blocks, overview) {
  if (blocks.length === 0) {
    return;
  }

  const onboardingIndex = locateOnboardingBlock(blocks, overview);
  const onboardingBlock = blocks[onboardingIndex];

  if (!overview) {
    record(1, 'STRUCTURE', file, onboardingBlock.startLine, 'DOCL-OVERVIEW-MISSING', 'token-extract',
      'README is missing ## Overview section.',
      'Add ## Overview as the opening prose section before any other section.');
  }

  if (!onboardingBlock || onboardingIndex < 0) {
    record(1, 'STRUCTURE', file, blocks[0].startLine, 'DOCL-ONBOARDING-MISSING', 'token-extract',
      'No Mermaid diagram found in ## Overview.',
      'Place a macro-level onboarding diagram in ## Overview.');
    return;
  }

  if (onboardingBlock.unterminated) {
    record(1, 'STRUCTURE', file, onboardingBlock.startLine, 'DOCL-MERMAID-BLOCK', 'token-extract',
      'Mermaid block is unterminated in markdown.',
      'Close the block with a trailing ``` line.');
  }

  checkOnboardingConstraints(file, onboardingBlock);

  const onboardingSyntax = checkSyntax(file, onboardingBlock, 1);
  if (!onboardingSyntax.ok) {
    record(1, onboardingSyntax.kind, file, onboardingSyntax.line, onboardingSyntax.code, onboardingSyntax.parser,
      onboardingSyntax.message, onboardingSyntax.remediation);
  }
}

function runPass2(file, blocks, overview) {
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

function runSummary(mode) {
  const relevantPasses = mode === 'pass1' ? [1] : mode === 'pass2' ? [2] : [1, 2];
  const relevant = violations.filter((v) => relevantPasses.includes(v.pass));
  const pass1 = violations.filter((v) => v.pass === 1);
  const pass2 = violations.filter((v) => v.pass === 2);
  const p1Struct = pass1.filter((v) => v.kind === 'STRUCTURE').length;
  const p1Syntax = pass1.filter((v) => v.kind === 'SYNTAX').length;
  const p2Struct = pass2.filter((v) => v.kind === 'STRUCTURE').length;
  const p2Syntax = pass2.filter((v) => v.kind === 'SYNTAX').length;

  console.log('DOC-LOAD SUMMARY');
  console.log(`failed: ${relevant.length}`);
  console.log(`pass-1: ${pass1.length} (${p1Struct} structural, ${p1Syntax} syntax)`);
  console.log(`pass-2: ${pass2.length} (${p2Struct} parser, ${p2Syntax} syntax)`);
  console.log(`status: ${relevant.length ? 'BLOCKED (cognitive-load gate)' : 'PASS'}`);
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

  const files = collectMarkdownFiles(DOCS_ROOT).sort();
  for (const file of files) {
    runFile(file, PASS_MODE);
  }

  runSummary(PASS_MODE);

  if (violations.some((v) => v.code === 'DOCL-MMD-TOOL')) {
    process.exit(12);
  }

  if (PASS_MODE === 'both' || PASS_MODE === 'pass1') {
    if (violations.some((v) => v.pass === 1)) {
      process.exit(10);
    }
  }

  if (PASS_MODE === 'both' || PASS_MODE === 'pass2') {
    if (violations.some((v) => v.pass === 2)) {
      process.exit(11);
    }
  }
}

main();
