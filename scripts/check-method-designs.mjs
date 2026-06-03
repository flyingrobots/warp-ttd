#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_FILES = [
  '.github/ISSUE_TEMPLATE/method-work.yml',
  '.github/ISSUE_TEMPLATE/bug.yml',
  '.github/ISSUE_TEMPLATE/spike.yml',
  '.github/pull_request_template.md',
  'docs/templates/design-cycle.md',
  'docs/templates/legacy-design-docs.txt',
];

const REQUIRED_FRONTMATTER_KEYS = [
  'format',
  'title',
  'cycle',
  'legend',
  'issue',
  'status',
  'base_commit',
  'created',
  'updated',
  'proof_policy',
  'agent_surfaces',
  'human_surfaces',
  'targets',
  'manual',
];

const REQUIRED_HEADINGS = [
  'Linked Issue',
  'Decision Summary',
  'Sponsored Human',
  'Sponsored Agent',
  'Hill',
  'Current Truth',
  'Problem',
  'Scope',
  'Non-Goals',
  'Agent-First Surface',
  'Runtime / API / Protocol Contract',
  'Evidence / Authority / Mutation Boundary',
  'Posture Matrix',
  'Host / Target Applicability',
  'Data / State Model',
  'Protocol / Generated Family Placement',
  'User Experience / Product Shape',
  'Accessibility Posture',
  'Localization / Directionality Posture',
  'Agent Inspectability / Explainability Posture',
  'Security / Redaction / Consent Posture',
  'Determinism Contract',
  'Compatibility / Migration Contract',
  'Linked Invariants',
  'Design Alternatives Considered',
  'Decision',
  'Implementation Slices',
  'Tests To Write First',
  'Acceptance Criteria',
  'Validation Plan',
  'Playback / Witness',
  'Manual / Operator Contract',
  'Risks',
  'Follow-On Issues',
  'Closeout Links',
];

const NON_DOC_PROOF_TAGS = [
  '[behavior]',
  '[runtime]',
  '[api]',
  '[cli-json]',
  '[mcp]',
  '[schema]',
  '[integration]',
  '[render]',
  '[accessibility]',
  '[tooling]',
];

const failures = [];

function repoPath(path) {
  return join(ROOT, path);
}

function readRepoText(path) {
  return readFileSync(repoPath(path), 'utf8');
}

function addFailure(message) {
  failures.push(message);
}

function fileExists(path) {
  try {
    return statSync(repoPath(path)).isFile();
  } catch {
    return false;
  }
}

function assertRequiredFiles() {
  for (const file of REQUIRED_FILES) {
    if (!fileExists(file)) {
      addFailure(`Missing required Method enforcement file: ${file}`);
    }
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function frontmatterOf(markdown) {
  if (!markdown.startsWith('---\n')) {
    return '';
  }
  const close = markdown.indexOf('\n---\n', 4);
  if (close === -1) {
    return '';
  }
  return markdown.slice(4, close);
}

function hasFrontmatterKey(frontmatter, key) {
  return new RegExp(`^${escapeRegex(key)}\\s*:`, 'mu').test(frontmatter);
}

function hasHeading(markdown, heading) {
  return new RegExp(`^## ${escapeRegex(heading)}\\s*$`, 'mu').test(markdown);
}

function sectionContent(markdown, heading) {
  const startPattern = new RegExp(`^## ${escapeRegex(heading)}\\s*$`, 'mu');
  const match = startPattern.exec(markdown);
  if (match === null) {
    return '';
  }
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = /\n## /u.exec(rest);
  return next === null ? rest.trim() : rest.slice(0, next.index).trim();
}

function frontmatterValue(frontmatter, key) {
  const match = new RegExp(`^${escapeRegex(key)}\\s*:\\s*"?([^"\\n]+)"?\\s*$`, 'mu').exec(frontmatter);
  return match?.[1]?.trim() ?? '';
}

function assertTemplate() {
  const template = readRepoText('docs/templates/design-cycle.md');
  const frontmatter = frontmatterOf(template);
  for (const key of REQUIRED_FRONTMATTER_KEYS) {
    if (!hasFrontmatterKey(frontmatter, key)) {
      addFailure(`Design template is missing frontmatter key: ${key}`);
    }
  }
  for (const heading of REQUIRED_HEADINGS) {
    if (!hasHeading(template, heading)) {
      addFailure(`Design template is missing heading: ${heading}`);
    }
  }
  if (!template.includes('proof_policy: "behavior-required|docs-only|process-only"')) {
    addFailure('Design template must declare proof_policy choices.');
  }
  for (const tag of NON_DOC_PROOF_TAGS) {
    if (!template.includes(tag)) {
      addFailure(`Design template must name non-doc proof tag ${tag}`);
    }
  }
}

function assertIssueTemplates() {
  const methodWork = readRepoText('.github/ISSUE_TEMPLATE/method-work.yml');
  const bug = readRepoText('.github/ISSUE_TEMPLATE/bug.yml');
  const spike = readRepoText('.github/ISSUE_TEMPLATE/spike.yml');
  for (const value of ['id: problem', 'id: desired-outcome', 'id: current-truth', 'id: agent-first-surface', 'lane:inbox']) {
    if (!methodWork.includes(value)) {
      addFailure(`Method work issue form is missing ${value}`);
    }
  }
  for (const value of ['type:bug', 'id: reproduction', 'id: agent-surface']) {
    if (!bug.includes(value)) {
      addFailure(`Bug issue form is missing ${value}`);
    }
  }
  for (const value of ['type:spike', 'id: question', 'id: proof']) {
    if (!spike.includes(value)) {
      addFailure(`Spike issue form is missing ${value}`);
    }
  }
}

function assertPrTemplate() {
  const template = readRepoText('.github/pull_request_template.md');
  for (const value of [
    'WARP Proof Checklist',
    'agent-first surface',
    'authority, admission, and mutation boundary',
    'non-doc proof test',
    'npm run check:method',
  ]) {
    if (!template.includes(value)) {
      addFailure(`PR template is missing ${value}`);
    }
  }
}

function listMarkdownFiles(dir) {
  const root = repoPath(dir);
  const results = [];
  function walk(absDir) {
    for (const name of readdirSync(absDir).sort()) {
      const absPath = join(absDir, name);
      const stat = statSync(absPath);
      if (stat.isDirectory()) {
        walk(absPath);
      } else if (stat.isFile() && name.endsWith('.md')) {
        results.push(relative(ROOT, absPath));
      }
    }
  }
  walk(root);
  return results;
}

function legacyDesignDocs() {
  return new Set(
    readRepoText('docs/templates/legacy-design-docs.txt')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#')),
  );
}

function assertLegacyList(legacy) {
  const entries = [...legacy];
  const sorted = [...entries].sort();
  if (entries.join('\n') !== sorted.join('\n')) {
    addFailure('docs/templates/legacy-design-docs.txt must stay sorted.');
  }
  for (const entry of entries) {
    if (!fileExists(entry)) {
      addFailure(`Legacy design allowlist entry does not exist: ${entry}`);
    }
  }
}

function assertNewDesignDoc(path) {
  const markdown = readRepoText(path);
  const frontmatter = frontmatterOf(markdown);
  if (frontmatter.length === 0) {
    addFailure(`${path} must have YAML frontmatter.`);
    return;
  }
  for (const key of REQUIRED_FRONTMATTER_KEYS) {
    if (!hasFrontmatterKey(frontmatter, key)) {
      addFailure(`${path} is missing frontmatter key: ${key}`);
    }
  }
  if (frontmatterValue(frontmatter, 'format') !== 'warp-design-v1') {
    addFailure(`${path} must declare format: "warp-design-v1".`);
  }
  for (const heading of REQUIRED_HEADINGS) {
    if (!hasHeading(markdown, heading)) {
      addFailure(`${path} is missing heading: ${heading}`);
    }
  }
  const proofPolicy = frontmatterValue(frontmatter, 'proof_policy');
  const tests = sectionContent(markdown, 'Tests To Write First');
  if (proofPolicy === 'behavior-required' && !NON_DOC_PROOF_TAGS.some((tag) => tests.includes(tag))) {
    addFailure(`${path} has behavior-required proof_policy but no non-doc proof tag in Tests To Write First.`);
  }
  const currentTruth = sectionContent(markdown, 'Current Truth');
  if (!/https:\/\/github\.com\/flyingrobots\/warp-ttd\/blob\/[0-9a-f]{40}\//u.test(currentTruth)) {
    addFailure(`${path} Current Truth must include at least one full-SHA GitHub permalink.`);
  }
}

function assertDesignDocs() {
  const legacy = legacyDesignDocs();
  assertLegacyList(legacy);
  for (const designDoc of listMarkdownFiles('docs/design')) {
    if (!legacy.has(designDoc)) {
      assertNewDesignDoc(designDoc);
    }
  }
}

function main() {
  assertRequiredFiles();
  if (failures.length === 0) {
    assertTemplate();
    assertIssueTemplates();
    assertPrTemplate();
    assertDesignDocs();
  }
  if (failures.length > 0) {
    process.stderr.write(`Method design enforcement failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('Method design enforcement passed.\n');
}

main();
