#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'flyingrobots';
const REPO = 'warp-ttd';
const ROADMAP_PATH = join(ROOT, 'ROADMAP.md');
const DAG_DOT_PATH = join(ROOT, 'docs', 'roadmap-dag.dot');
const DAG_SVG_PATH = join(ROOT, 'docs', 'roadmap-dag.svg');

const ROADMAP_MODEL = [
  {
    id: 'M0',
    title: 'Present-Day Reality And Release Governance',
    summary:
      'Make the current tracker, docs, schema ownership, and release gates honest before expanding the debugger surface.',
    userStories: [
      'As a maintainer, I can see which work is release-scoped and which work is exploratory without reading private notes.',
      'As an agent, I can determine the next legal slice from GitHub Issues and reproduce the roadmap DAG without editing markdown by hand.',
      'As a reviewer, I can reject a PR when the ROADMAP, issue graph, and generated DAG disagree.',
    ],
    requirements: [
      'GitHub Issues remain the source of truth for state, parent/child issue relationships, and blocked-by/blocking edges.',
      'The generated roadmap and DAG are committed before any PR that changes sequencing, scope, or dependencies is opened.',
      'Protocol/schema ownership gaps are represented as issues before downstream implementation relies on them.',
    ],
    acceptance: [
      'ROADMAP.md and docs/roadmap-dag.svg regenerate cleanly from live GitHub issue data.',
      'v0.1.0 gates are visible as GitHub issues, not private backlog notes.',
      'Release readiness is blocked until local-only or undocumented work is either published, deferred, or removed from scope.',
    ],
    goalposts: [
      {
        number: 74,
        story:
          'Close v0.1.0 from a clean, auditable state where tracker, docs, tests, and release notes agree.',
        requirements: ['All scoped work is represented on GitHub.', 'No release-relevant work remains private/local-only.'],
        acceptance: ['Baseline validation passes at the release commit.', 'docs/BEARING.md points to the next true target.'],
      },
      {
        number: 72,
        story:
          'Retire legacy filesystem backlog as live planning state while preserving useful history as evidence.',
        requirements: ['GitHub Issues own live work.', 'Legacy cards are retired, stubbed, or explicitly deferred.'],
        acceptance: ['No active slice requires reading docs/method/backlog as source of truth.'],
      },
      {
        number: 88,
        story:
          'Make Method design checks strict enough that shallow sections cannot pass as implementation-ready plans.',
        requirements: ['Method check enforces required design depth.', 'CI gates the checker.'],
        acceptance: ['A shallow design fixture fails the checker with actionable output.'],
      },
      {
        number: 89,
        story: 'Make GitHub comment and review-note workflows file-backed or API-safe instead of shell-quoting fragile.',
        requirements: ['Agents can post long structured comments safely.', 'No secret-bearing shell interpolation is required.'],
        acceptance: ['A workflow test or documented smoke demonstrates safe comment posting.'],
      },
      {
        number: 90,
        story: 'Detect stale active-work labels before they distort roadmap health.',
        requirements: ['Closed or inactive issues cannot silently keep work-in-progress posture.'],
        acceptance: ['A checker reports stale work-in-progress or lane labels.'],
      },
      {
        number: 91,
        story:
          'Teach agents and humans how to use the first structured debugger surfaces once the contracts stabilize.',
        requirements: ['Cookbook examples use CLI JSON/MCP/read-model facts.', 'No examples depend on scraping TUI output.'],
        acceptance: ['A new agent can execute at least one causal-debugger workflow from the cookbook.'],
      },
      {
        number: 92,
        story:
          'Provide deterministic simulator fixtures for capability discovery and unsupported/obstructed capability states.',
        requirements: ['Fixtures cover present, absent, unsupported, obstructed, rights-limited, and redacted cases.'],
        acceptance: ['Capability discovery tests can run without live Echo or browser targets.'],
      },
      {
        number: 113,
        story:
          'Reconcile canonical WARP TTD schemas with downstream Echo/TTD consumers before deeper protocol growth relies on mirrors.',
        requirements: ['Canonical schema ownership is explicit.', 'Generated downstream artifacts stay downstream.'],
        acceptance: ['The external handoff path is reproducible or the remaining gap is explicitly tracked.'],
      },
    ],
  },
  {
    id: 'M1',
    title: 'Continuum Runtime Discovery Foundation',
    summary:
      'Move from descriptor-backed witness targets to deterministic runtime discovery, consent/auth posture, and capability reporting.',
    userStories: [
      'As an agent, I can list configured Continuum-compatible targets and inspect why a runtime is reachable, absent, unsupported, or obstructed.',
      'As an operator, I can see endpoint trust and auth posture without leaking secrets into logs, JSON, MCP, screenshots, or reports.',
      'As a debugger client, I can ask which operations are legal before trying replay, causal query, breakpoint, branch, comparison, ledger, or export features.',
    ],
    requirements: [
      'Discovery is deterministic and consent-aware; there is no ambient network scanning.',
      'Endpoint consent/auth/redaction is represented as structured posture, not implicit connection failure.',
      'Capability discovery reports legal debugger operations separately from authority grants.',
    ],
    acceptance: [
      'CLI JSON/JSONL and MCP expose the same discovery and capability facts.',
      'Unsupported and obstructed targets include machine-readable reasons.',
      'No slice issues authority, performs runtime admission, mutates a host, or parses raw Echo WAL.',
    ],
    goalposts: [
      {
        number: 76,
        story: 'Establish app/vendor/substrate identity as reported target facts, not dispatch boundaries.',
        requirements: ['jedit and graft remain witness descriptors.', 'Synthetic third target registration is possible.'],
        acceptance: ['targets and target-session JSON iterate registered Continuum-compatible descriptors.'],
      },
      {
        number: 80,
        story: 'Define and expose vendor-neutral runtime hello posture before local registry and endpoint connection hardening.',
        requirements: ['continuum.debug.hello.v1 is inspected without authority or mutation.', 'MCP parity exists.'],
        acceptance: ['runtime-hello JSON and MCP return explicit evidence posture.'],
        blockedBy: [76],
      },
      {
        number: 78,
        story: 'Add deterministic local runtime discovery and registry facts for Continuum-compatible runtimes.',
        requirements: ['Local registry shape is explicit.', 'Absent, unsupported, obstructed, and reachable states are distinct.'],
        acceptance: ['Agents can run discovery and get deterministic CLI/MCP output.'],
        blockedBy: [80],
      },
      {
        number: 79,
        story: 'Report consent, authentication, trust, redaction, and credential failure posture before live endpoints grow.',
        requirements: ['Secrets are never emitted in structured surfaces.', 'Denied, expired, missing, and malformed credentials are distinct.'],
        acceptance: ['Policy tests prove redaction and consent/auth posture output.'],
        blockedBy: [78],
      },
      {
        number: 82,
        story: 'Expose a debugger capability matrix before agents or humans attempt causal debugger operations.',
        requirements: ['Capabilities include replay, query, breakpoint, branch, comparison, ledger, export, and admitted-control posture.'],
        acceptance: ['CLI JSON and MCP report capability support with reasons for every unsupported or obstructed feature.'],
        blockedBy: [79, 113],
      },
    ],
  },
  {
    id: 'M2',
    title: 'Causal Inquiry And Breakpoint Bedrock',
    summary:
      'Teach WARP TTD to answer why, why-not, first-cause, absence, invariant, and breakpoint questions as agent-readable facts.',
    userStories: [
      'As an investigator, I can ask why a fact happened and receive a replay-basis-linked cause chain.',
      'As an investigator, I can ask why an expected fact did not happen and receive explicit absence evidence.',
      'As an agent, I can set deterministic breakpoint predicates and inspect machine-readable hit records.',
    ],
    requirements: [
      'CausalQuery and BreakpointSpec forms are deterministic and testable.',
      'Hit records cite replay basis, coordinate, predicate, inspected facts, evidence posture, and retry/export options.',
      'No UI-only truth ships before CLI JSON/MCP/read-model surfaces.',
    ],
    acceptance: [
      'A RED test evaluates at least one real causal-debugger predicate against a deterministic replay basis.',
      'Breakpoint hits and query answers are evidence-backed machine-readable facts.',
    ],
    goalposts: [
      {
        number: 83,
        story: 'Define the causal query and breakpoint contract that becomes the Explain half of Workbench.',
        requirements: ['WHY, WHY_NOT, causal slice, first cause, absence, and invariant search are named.'],
        acceptance: ['At least one predicate executes against a deterministic replay basis.'],
        blockedBy: [82],
      },
      {
        number: 100,
        story: 'Promote why-not causal query thinking into the contract once the main query surface exists.',
        requirements: ['Absence and blocked alternatives are inspectable rather than inferred.'],
        acceptance: ['Why-not answers cite the facts that prevented the expected outcome.'],
        blockedBy: [83],
      },
    ],
  },
  {
    id: 'M3',
    title: 'Counterfactual Branches And Comparisons',
    summary:
      'Make Follow real: create debugger-local branch records, compare actual and counterfactual facts, and keep assumptions visible.',
    userStories: [
      'As an investigator, I can follow an admissible path in a deterministic fork without mutating canonical history.',
      'As a reviewer, I can see exactly which facts changed, which stayed fixed, which assumptions were used, and which evidence proves the comparison.',
      'As an agent, I can inspect actual-vs-branch diffs through CLI/MCP before any visual workbench renders them.',
    ],
    requirements: [
      'CounterfactualBranch records include basis, intervention, assumptions, evaluator posture, divergence coordinate, changed/unchanged/obstructed/redacted facts.',
      'Counterfactual history is never presented as actual history.',
      'Comparison output remains host-neutral and capability-gated.',
    ],
    acceptance: [
      'Actual-vs-branch and recorded-run-vs-recorded-run comparison facts are exportable.',
      'Assumption and obstruction posture are visible in every branch comparison.',
    ],
    goalposts: [
      {
        number: 84,
        story: 'Design and expose the counterfactual branch workbench and worldline comparison read model.',
        requirements: ['Branch basis, intervention, assumptions, divergence, and comparison facts are explicit.'],
        acceptance: ['A reviewer can audit what changed and why from structured output.'],
        blockedBy: [83],
      },
      {
        number: 98,
        story: 'Minimize causal deltas for counterfactual branches once basic comparison exists.',
        requirements: ['Counterfactual deltas are ranked by causal relevance, not raw text size.'],
        acceptance: ['A branch comparison can point to the smallest meaningful causal divergence.'],
        blockedBy: [84],
      },
    ],
  },
  {
    id: 'M4',
    title: 'Evidence Ledger And Durable Investigation Assets',
    summary:
      'Convert debugging sessions into durable assurance assets: reports, receipts, tests, obligations, compliance envelopes, and event streams.',
    userStories: [
      'As an incident responder, I can export the evidence behind an investigation as Markdown plus JSON for issue, PR, or audit review.',
      'As an agent, I can consume the same evidence bundle without scraping a rendered report.',
      'As an assurance owner, I can see which obligations, redactions, rights limits, budget limits, and obstructions remain.',
    ],
    requirements: [
      'Reports cite replay basis, coordinates, query results, breakpoint hits, branch assumptions, source refs, and validation commands.',
      'Redaction and consent posture survive export.',
      'Debugger-session events have deterministic IDs and ordering before browser/TUI consumers depend on them.',
    ],
    acceptance: [
      'A generated evidence bundle can be attached to a PR and independently inspected by an agent.',
      'Compliance and diagnostic envelopes are protocol-shaped, capability-gated, and test-backed.',
    ],
    goalposts: [
      {
        number: 116,
        story: 'Define a Tap-shaped debugger-session event outbox for deterministic session event streams.',
        requirements: ['Backfill/live cutover, per-source ordering, event IDs, sequence numbers, and ack posture are explicit.'],
        acceptance: ['CLI JSONL and MCP can expose identical event streams before UI consumers rely on them.'],
        blockedBy: [82],
      },
      {
        number: 85,
        story: 'Define evidence ledger and investigation report export surfaces.',
        requirements: ['Receipts, witnesses, admission results, readings, redactions, rights limits, budget limits, and obstructions are preserved.'],
        acceptance: ['Markdown plus JSON bundles can be attached to issues or PRs.'],
        blockedBy: [84, 116],
      },
      {
        number: 115,
        story: 'Extend the TTD protocol with compliance reporting envelopes where hosts expose compliance checks.',
        requirements: ['Violation and summary envelopes are capability-gated.', 'Severity, code, tick, channel, and rule refs are preserved.'],
        acceptance: ['Compliance violations can render inline with replay facts and export through evidence bundles.'],
        blockedBy: [85],
      },
    ],
  },
  {
    id: 'M5',
    title: 'Human Workbench Over Agent-Readable Facts',
    summary:
      'Render the Workbench only after structured facts exist: evidence timeline, fact inspector, inquiry workbench, browser targets, and replay controls.',
    userStories: [
      'As a developer fixing a blocked PR, I can open the failed region, inspect the causal passport, see a dangerous future ghost, run Explain, Follow the trace, and export a test.',
      'As an accessibility reviewer, I can audit the workspace without relying on visual-only truth.',
      'As an agent supervisor, I can compare what the human saw with the CLI/MCP facts the agent consumed.',
    ],
    requirements: [
      'The UI composes structured facts from prior milestones and never becomes canonical debugger truth.',
      'Actual/counterfactual status, evidence posture, redaction, and rights limits are represented textually and structurally, not only by color or layout.',
      'Browser and VISOR targets use the same target discovery, hello, capability, replay, and report contracts.',
    ],
    acceptance: [
      'The rendered workspace can be audited without screen scraping.',
      'Blocked PR to Workbench v0.1 flow completes in the narrow demo: region, passport, ghost, Explain, Follow, export test, obligation update, blind spots.',
    ],
    goalposts: [
      {
        number: 86,
        story: 'Design and implement the human causal debugger workspace over agent-readable facts.',
        requirements: ['Evidence Timeline, Fact Inspector, and Inquiry Workbench compose prior structured surfaces.'],
        acceptance: ['No visual-only truth is required to understand or audit a debugging session.'],
        blockedBy: [85],
      },
      {
        number: 108,
        story: 'Add a Launchpad/browser runtime hello target descriptor.',
        requirements: ['Browser runtime target identity and hello posture follow the same contracts as other Continuum targets.'],
        acceptance: ['Browser targets can participate in runtime hello inspection.'],
        blockedBy: [78],
      },
      {
        number: 107,
        story: 'Expose browser replay tick history as a debugger read model.',
        requirements: ['Browser replay history is deterministic and agent-readable.'],
        acceptance: ['Replay tick history can be consumed without browser screen scraping.'],
        blockedBy: [108, 82],
      },
      {
        number: 106,
        story: 'Define rewind current visit control contract for browser sessions.',
        requirements: ['Control is capability-gated and does not imply host authority beyond the declared surface.'],
        acceptance: ['Rewind control can report unsupported, obstructed, and permitted posture.'],
        blockedBy: [107],
      },
      {
        number: 56,
        story: 'Deliver the browser TTD adapter as a real witness target for the Workbench ladder.',
        requirements: ['Browser adapter uses target discovery, runtime hello, capability discovery, replay, and evidence posture contracts.'],
        acceptance: ['Browser sessions can be inspected through structured debugger surfaces.'],
        blockedBy: [106, 86],
      },
      {
        number: 117,
        story: 'Use WARP TTD to inspect Bijou VISOR artifact bundles in the browser debugger.',
        requirements: ['VISOR bundle facts, replay metadata, and render receipts enter the debugger as structured facts.'],
        acceptance: ['Unsupported contract versions fail loudly and deterministically.'],
        blockedBy: [56, 86],
      },
    ],
  },
  {
    id: 'M6',
    title: 'North-Star Workbench, Worker, Verify, And Ledger Loop',
    summary:
      'Finish the outcome-oriented debugger: apertures as code, membranes, Force/Forbid, Worker obligation loops, Verify capsules, retro-patrol, and multiplayer forensics.',
    userStories: [
      'As a developer, I can select a bad future and receive bounded, evidence-graded intervention plans rather than unverified suggestions.',
      'As an agent, I receive an aperture and obligation, not a whole repo and vague prompt.',
      'As an auditor, I can verify support obligations, receipt capsules, and residual assumption debt across boundaries.',
    ],
    requirements: [
      'Aperture profiles are versioned artifacts that show included, excluded, abstracted, and blind-spot facts.',
      'Uncertainty membranes name external chaos, owner, TTL, containment level, and gate impact.',
      'Force and Forbid remain bounded and evidence-graded; a patch is not called proof-discharged until a verifier earns that claim.',
      'Worker and Verify operate through the same issue, evidence, receipt, and gate loop as humans.',
    ],
    acceptance: [
      'Workbench v0.1 grows into Follow, Force, Forbid, Explain without toolbar inflation.',
      'Agent work product is admissible-or-rejected by the same Gate and entered into the same evidence ledger.',
      'Retro-patrol can reobserve archived history under new observers without pretending to re-execute unavailable facts.',
    ],
    futureGoalposts: [
      'Aperture profiles and Aperture Diff as code.',
      'Uncertainty membranes and assumption capsules.',
      'Force solver with bounded constraints and explicit unsupported cases.',
      'Forbid intervention plans with fork validation and patch evidence grades.',
      'Xyph Worker obligation loop over aperture-bounded tasks.',
      'Xyph Verify support obligation capsule export and ingest.',
      'Retro-patrol and multiplayer investigation records.',
    ],
    goalposts: [
      {
        number: 28,
        story: 'Carry forward the Constraint Lens and Provenance Heatmap ideas into Workbench north-star planning.',
        requirements: ['Constraint and provenance views stay downstream of structured facts.'],
        acceptance: ['Future UI work can map lens output to causal query, passport, and evidence bundle facts.'],
        blockedBy: [86],
      },
      {
        number: 29,
        story: 'Keep the reliving debugger MVP thread aligned with the Workbench v0.1 loop.',
        requirements: ['Timeline scrub, causal slice, and fork branch map to Explain and Follow facts.'],
        acceptance: ['No reliving UI depends on hidden state unavailable to agents.'],
        blockedBy: [86],
      },
      {
        number: 31,
        story: 'Promote rulial diff/worldline compare work only after branch comparison facts exist.',
        requirements: ['Worldline compare uses structured branch comparison facts.'],
        acceptance: ['Diff output can be exported and inspected as evidence.'],
        blockedBy: [84],
      },
    ],
  },
];

const CHECKED_BOX = '[x]';
const OPEN_BOX = '[ ]';

function usage() {
  console.error('usage: node scripts/roadmap-dag.mjs <generate|check|sync> [--apply]');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}${result.stderr}`);
  }
  return result.stdout;
}

function graphql(query, variables = {}) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    args.push('-F', `${key}=${value}`);
  }
  const output = run('gh', args);
  const parsed = JSON.parse(output);
  if (parsed.errors?.length > 0) {
    throw new Error(JSON.stringify(parsed.errors, null, 2));
  }
  return parsed.data;
}

function uniqueIssueNumbers() {
  const numbers = new Set();
  for (const milestone of ROADMAP_MODEL) {
    for (const goalpost of milestone.goalposts) {
      numbers.add(goalpost.number);
      for (const blocker of goalpost.blockedBy ?? []) {
        numbers.add(blocker);
      }
    }
  }
  return [...numbers].sort((a, b) => a - b);
}

function issueFields(prefix = '') {
  return `
    ${prefix}id
    ${prefix}number
    ${prefix}title
    ${prefix}state
    ${prefix}url
    ${prefix}body
    ${prefix}labels(first: 50) { nodes { name } }
    ${prefix}milestone { title }
    ${prefix}parent { number title url state }
    ${prefix}repository { nameWithOwner }
    ${prefix}blockedBy(first: 100) { nodes { id number title state url repository { nameWithOwner } labels(first: 20) { nodes { name } } } }
    ${prefix}blocking(first: 100) { nodes { id number title state url repository { nameWithOwner } labels(first: 20) { nodes { name } } } }
    ${prefix}subIssues(first: 100) {
      nodes {
        id
        number
        title
        state
        url
        repository { nameWithOwner }
        labels(first: 30) { nodes { name } }
        blockedBy(first: 50) { nodes { id number title state url repository { nameWithOwner } } }
      }
    }
  `;
}

function repositoryIssueFields() {
  return `
    id
    number
    title
    state
    url
    body
    labels(first: 50) { nodes { name } }
    milestone { title }
    parent { number title url state }
    repository { nameWithOwner }
    blockedBy(first: 50) { nodes { id number title state url repository { nameWithOwner } labels(first: 20) { nodes { name } } } }
  `;
}

function fetchRepositoryIssues() {
  const issues = [];
  let after = null;
  do {
    const afterArgument = after ? ', after: $after' : '';
    const variableDeclaration = after ? '($after: String!)' : '';
    const query = `
      query RoadmapRepositoryIssues${variableDeclaration} {
        repository(owner: "${OWNER}", name: "${REPO}") {
          issues(first: 100${afterArgument}, states: [OPEN, CLOSED], orderBy: { field: CREATED_AT, direction: ASC }) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              ${repositoryIssueFields()}
            }
          }
        }
      }
    `;
    const data = graphql(query, after ? { after } : {});
    const connection = data.repository.issues;
    issues.push(...connection.nodes);
    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (after);
  return issues;
}

function fetchIssue(number) {
  const query = `
    query RoadmapIssue {
      repository(owner: "${OWNER}", name: "${REPO}") {
        issue(number: ${number}) {
          ${issueFields()}
        }
      }
    }
  `;
  const data = graphql(query);
  return data.repository.issue;
}

function fetchIssues() {
  const issues = new Map();
  const trackedNumbers = new Set(uniqueIssueNumbers());
  const remember = (value, options = {}) => {
    if (value === null) {
      return;
    }
    if (options.replace === true || !issues.has(value.number)) {
      issues.set(value.number, value);
    }
    for (const subIssue of value.subIssues?.nodes ?? []) {
      if (!issues.has(subIssue.number)) {
        issues.set(subIssue.number, subIssue);
      }
    }
    for (const blocker of value.blockedBy?.nodes ?? []) {
      if (!issues.has(blocker.number)) {
        issues.set(blocker.number, blocker);
      }
    }
  };
  for (const number of trackedNumbers) {
    remember(fetchIssue(number), { replace: true });
  }
  for (const issue of fetchRepositoryIssues()) {
    if (trackedNumbers.has(issue.number)) {
      remember(issue);
    } else if (trackedNumbers.has(issue.parent?.number)) {
      remember(issue, { replace: true });
    }
  }
  return issues;
}

function subIssuesFor(issue, issues) {
  const children = new Map();
  for (const subIssue of issue?.subIssues?.nodes ?? []) {
    children.set(subIssue.number, subIssue);
  }
  for (const candidate of issues.values()) {
    if (candidate.parent?.number === issue?.number && !children.has(candidate.number)) {
      children.set(candidate.number, candidate);
    }
  }
  return [...children.values()].sort((a, b) => a.number - b.number);
}

function labelsOf(issue) {
  return issue?.labels?.nodes?.map((label) => label.name) ?? [];
}

function openBlockers(issue, issues) {
  return (issue?.blockedBy?.nodes ?? []).filter((blocker) => {
    const live = issues.get(blocker.number) ?? blocker;
    return live.state !== 'CLOSED';
  });
}

function statusOf(issue, issues) {
  if (!issue) {
    return 'missing';
  }
  if (issue.state === 'CLOSED') {
    return 'completed';
  }
  if (labelsOf(issue).includes('blocked') || openBlockers(issue, issues).length > 0) {
    return 'blocked';
  }
  return 'open';
}

function checkboxFor(issue) {
  return issue?.state === 'CLOSED' ? CHECKED_BOX : OPEN_BOX;
}

function statusLabel(issue, issues) {
  const status = statusOf(issue, issues);
  if (status === 'completed') {
    return 'completed';
  }
  if (status === 'blocked') {
    const blockers = openBlockers(issue, issues).map((blocker) => `#${blocker.number}`).join(', ');
    return `blocked by ${blockers}`;
  }
  if (status === 'missing') {
    return 'missing';
  }
  return 'open';
}

function issueLink(issue, fallbackNumber) {
  if (!issue) {
    return `#${fallbackNumber}`;
  }
  const prefix = issue.repository?.nameWithOwner === `${OWNER}/${REPO}` || issue.repository === undefined
    ? `#${issue.number}`
    : `${issue.repository.nameWithOwner}#${issue.number}`;
  return `[${prefix} ${escapeMarkdown(issue.title)}](${issue.url})`;
}

function escapeMarkdown(value) {
  return value.replace(/\|/g, '\\|');
}

function modelGoalposts() {
  const result = [];
  for (const milestone of ROADMAP_MODEL) {
    for (const goalpost of milestone.goalposts) {
      result.push({ milestone, goalpost });
    }
  }
  return result;
}

function desiredEdges() {
  const edges = [];
  for (const { goalpost } of modelGoalposts()) {
    for (const blocker of goalpost.blockedBy ?? []) {
      edges.push({ blocker, blocked: goalpost.number });
    }
  }
  return edges;
}

function missingDesiredEdges(issues) {
  return desiredEdges().filter(({ blocker, blocked }) => {
    const issue = issues.get(blocked);
    return !issue?.blockedBy?.nodes?.some((node) => node.number === blocker);
  });
}

function buildMarkdown(issues) {
  const lines = [];
  lines.push('# ROADMAP');
  lines.push('');
  lines.push('This roadmap is the project ladder from current WARP TTD reality to the outcome-oriented debugger north star.');
  lines.push('GitHub Issues are authoritative for task state, parent/child issue relationships, and blocked-by/blocking edges.');
  lines.push('Run `npm run roadmap:generate` after changing issue relationships, and commit this file plus the generated DAG artifacts.');
  lines.push('');
  lines.push('![Roadmap DAG](docs/roadmap-dag.svg)');
  lines.push('');
  lines.push('## Operating Model');
  lines.push('');
  lines.push('| Layer | Meaning | Source of truth |');
  lines.push('| --- | --- | --- |');
  lines.push('| Milestone | Product-stage grouping from present day to north star. | This roadmap, reviewed in PRs. |');
  lines.push('| Goalpost | Feature-scoped parent issue that can be designed, reviewed, and closed. | GitHub parent issue. |');
  lines.push('| Slice | Commit-sized child issue under a goalpost. | GitHub sub-issue. |');
  lines.push('| Dependency | A `blockedBy` / `blocking` issue edge. | GitHub native issue dependency graph. |');
  lines.push('');
  lines.push('Status colors in the DAG: green means open and unblocked, red means blocked by at least one open issue, and gray means completed.');
  lines.push('Dependency edges point from blocker to blocked issue. A red thick edge means the blocker is still open; a green normal edge means the blocker is complete.');
  lines.push('The Graphviz `dot` layout is used as the Sugiyama-style layered layout for the roadmap DAG.');
  lines.push('');
  lines.push('## Canonical Sources');
  lines.push('');
  lines.push('| Question | Source | Rule |');
  lines.push('| --- | --- | --- |');
  lines.push('| What are we building? | [VISION.md](./VISION.md) | Durable product doctrine and north star. |');
  lines.push('| What is the active bearing? | [docs/BEARING.md](./docs/BEARING.md) | Current queue and active tensions. |');
  lines.push('| What has shipped? | [CHANGELOG.md](./CHANGELOG.md) | Historical release truth. |');
  lines.push('| What is live work? | [GitHub Issues](https://github.com/flyingrobots/warp-ttd/issues) | Authoritative state and dependencies. |');
  lines.push('| What gates release? | [#74](https://github.com/flyingrobots/warp-ttd/issues/74) | v0.1.0 closeout checklist. |');
  lines.push('| How do cycles move? | [METHOD.md](./METHOD.md) | Design/proof workflow. |');
  lines.push('');
  lines.push('## North Star');
  lines.push('');
  lines.push('WARP TTD becomes the agent-native, facts-first core of Xyph Workbench: an outcome-oriented debugger for Continuum-compatible runtimes.');
  lines.push('It does not merely replay one execution. It navigates admissible executions around the current basis, with causal passports behind each value, future envelopes ahead, explicit apertures around every question, and durable evidence artifacts after every investigation.');
  lines.push('');
  lines.push('The shipped product remains disciplined: facts before UI, capability-gated operations, immutable history, explicit evidence posture, visible apertures and blind spots, named uncertainty membranes, and identical structured surfaces for humans and agents.');
  lines.push('');
  lines.push('## Milestones, Goalposts, And Slices');
  lines.push('');

  for (const milestone of ROADMAP_MODEL) {
    lines.push(`### ${milestone.id}. ${milestone.title}`);
    lines.push('');
    lines.push(milestone.summary);
    lines.push('');
    lines.push('User stories:');
    for (const story of milestone.userStories) {
      lines.push(`- ${story}`);
    }
    lines.push('');
    lines.push('Requirements:');
    for (const requirement of milestone.requirements) {
      lines.push(`- ${requirement}`);
    }
    lines.push('');
    lines.push('Acceptance criteria:');
    for (const acceptance of milestone.acceptance) {
      lines.push(`- ${acceptance}`);
    }
    lines.push('');
    if (milestone.futureGoalposts?.length > 0) {
      lines.push('Future parent issues to create before implementation:');
      for (const title of milestone.futureGoalposts) {
        lines.push(`- ${OPEN_BOX} ${title}`);
      }
      lines.push('');
    }
    for (const goalpost of milestone.goalposts) {
      const issue = issues.get(goalpost.number);
      lines.push(`#### Goalpost ${issueLink(issue, goalpost.number)}`);
      lines.push('');
      lines.push(`Status: **${statusLabel(issue, issues)}**`);
      lines.push('');
      lines.push(`User story: ${goalpost.story}`);
      lines.push('');
      lines.push('Requirements:');
      for (const requirement of goalpost.requirements) {
        lines.push(`- ${requirement}`);
      }
      lines.push('');
      lines.push('Acceptance criteria:');
      for (const acceptance of goalpost.acceptance) {
        lines.push(`- ${acceptance}`);
      }
      lines.push('');
      lines.push('GitHub checklist:');
      lines.push(`- ${checkboxFor(issue)} ${issueLink(issue, goalpost.number)} - parent goalpost`);
      const subIssues = subIssuesFor(issue, issues);
      if (subIssues.length === 0) {
        if (issue?.state === 'CLOSED') {
          lines.push(`  - ${CHECKED_BOX} No child slice issues recorded before the roadmap DAG contract existed.`);
        } else {
          lines.push(`  - ${OPEN_BOX} Create child slice issues before implementation starts.`);
        }
      } else {
        for (const subIssue of subIssues) {
          lines.push(`  - ${checkboxFor(subIssue)} ${issueLink(subIssue, subIssue.number)} - child slice`);
        }
      }
      const blockers = issue?.blockedBy?.nodes ?? [];
      if (blockers.length > 0) {
        lines.push('Dependencies:');
        for (const blocker of blockers.sort((a, b) => a.number - b.number)) {
          const liveBlocker = issues.get(blocker.number) ?? blocker;
          lines.push(`- blocked by ${issueLink(liveBlocker, blocker.number)} (${statusLabel(liveBlocker, issues)})`);
        }
      }
      lines.push('');
    }
  }

  lines.push('## Dependency Checklist');
  lines.push('');
  lines.push('These expected blocker edges are part of the planned product sequence. `npm run roadmap:check` verifies that GitHub native issue dependencies match them.');
  lines.push('');
  for (const edge of desiredEdges()) {
    const blocker = issues.get(edge.blocker);
    const blocked = issues.get(edge.blocked);
    const present = blocked?.blockedBy?.nodes?.some((node) => node.number === edge.blocker);
    lines.push(`- ${present ? CHECKED_BOX : OPEN_BOX} ${issueLink(blocker, edge.blocker)} blocks ${issueLink(blocked, edge.blocked)}`);
  }
  lines.push('');
  lines.push('## Regeneration');
  lines.push('');
  lines.push('Use these commands when issue state, sub-issues, or dependency edges change:');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run roadmap:generate');
  lines.push('npm run roadmap:check');
  lines.push('```');
  lines.push('');
  lines.push('To seed the planned blocker edges into GitHub native issue dependencies, run:');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run roadmap:sync -- --apply');
  lines.push('```');
  lines.push('');
  lines.push('The sync command only adds missing planned blocker edges. It does not remove extra dependencies; removing dependencies is a deliberate tracker operation.');
  lines.push('');
  while (lines.at(-1) === '') {
    lines.pop();
  }
  return `${lines.join('\n')}\n`;
}

function dotId(number) {
  return `issue_${number}`;
}

function dotString(value) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function dotIssuePrefix(issue) {
  return issue.repository?.nameWithOwner === `${OWNER}/${REPO}` || issue.repository === undefined
    ? `#${issue.number}`
    : `${issue.repository.nameWithOwner}#${issue.number}`;
}

function nodeAttributes(issue, issues) {
  const status = statusOf(issue, issues);
  if (status === 'completed') {
    return { fill: '#e5e7eb', stroke: '#6b7280', font: '#111827' };
  }
  if (status === 'blocked') {
    return { fill: '#ffd7d7', stroke: '#bd2c00', font: '#111827' };
  }
  if (status === 'missing') {
    return { fill: '#fff7ed', stroke: '#f97316', font: '#111827' };
  }
  return { fill: '#d8f5d0', stroke: '#248232', font: '#111827' };
}

function buildDot(issues) {
  const lines = [];
  const emitted = new Set();
  lines.push('digraph RoadmapDAG {');
  lines.push('  graph [layout=dot, rankdir=LR, compound=true, newrank=true, overlap=false, splines=ortho, bgcolor="white", fontname="Helvetica", label="WARP TTD Roadmap DAG (Graphviz dot / Sugiyama-style layered layout)", labelloc=t, fontsize=18];');
  lines.push('  node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=10, margin="0.08,0.05"];');
  lines.push('  edge [fontname="Helvetica", fontsize=9, arrowsize=0.7, color="#248232", penwidth=1.4];');
  lines.push('  legend_open [label="OPEN", fillcolor="#d8f5d0", color="#248232"];');
  lines.push('  legend_blocked [label="BLOCKED", fillcolor="#ffd7d7", color="#bd2c00"];');
  lines.push('  legend_done [label="COMPLETED", fillcolor="#e5e7eb", color="#6b7280"];');
  lines.push('  legend_open -> legend_blocked [label="open dependency", color="#248232", penwidth=1.4];');
  lines.push('  legend_blocked -> legend_done [label="blocked dependency", color="#bd2c00", penwidth=3.2];');
  for (const milestone of ROADMAP_MODEL) {
    lines.push(`  subgraph cluster_${milestone.id} {`);
    lines.push(`    label=${dotString(`${milestone.id}. ${milestone.title}`)};`);
    lines.push('    color="#d1d5db";');
    lines.push('    style="rounded";');
    for (const goalpost of milestone.goalposts) {
      const issue = issues.get(goalpost.number);
      const attrs = nodeAttributes(issue, issues);
      const label = issue ? `${dotIssuePrefix(issue)}\\n${issue.title}` : `#${goalpost.number}\\nMissing issue`;
      lines.push(`    subgraph cluster_goalpost_${goalpost.number} {`);
      lines.push(`      label=${dotString(`#${goalpost.number}`)};`);
      lines.push('      color="#e5e7eb";');
      lines.push('      style="rounded,dashed";');
      lines.push(`      ${dotId(goalpost.number)} [label=${dotString(label)}, fillcolor="${attrs.fill}", color="${attrs.stroke}", fontcolor="${attrs.font}", URL=${dotString(issue?.url ?? '')}];`);
      emitted.add(goalpost.number);
      for (const subIssue of subIssuesFor(issue, issues)) {
        const subAttrs = nodeAttributes(subIssue, issues);
        lines.push(`      ${dotId(subIssue.number)} [label=${dotString(`${dotIssuePrefix(subIssue)}\\n${subIssue.title}`)}, fillcolor="${subAttrs.fill}", color="${subAttrs.stroke}", fontcolor="${subAttrs.font}", URL=${dotString(subIssue.url)}];`);
        lines.push(`      ${dotId(goalpost.number)} -> ${dotId(subIssue.number)} [style=dotted, color="#6b7280", penwidth=1.0, label="slice"];`);
        emitted.add(subIssue.number);
      }
      lines.push('    }');
    }
    lines.push('  }');
  }
  const extraBlockers = new Map();
  for (const { goalpost } of modelGoalposts()) {
    const issue = issues.get(goalpost.number);
    for (const blocker of issue?.blockedBy?.nodes ?? []) {
      if (!emitted.has(blocker.number)) {
        extraBlockers.set(blocker.number, issues.get(blocker.number) ?? blocker);
      }
    }
  }
  if (extraBlockers.size > 0) {
    lines.push('  subgraph cluster_external {');
    lines.push('    label="External blockers";');
    lines.push('    color="#f97316";');
    lines.push('    style="rounded,dashed";');
    for (const issue of [...extraBlockers.values()].sort((a, b) => a.number - b.number)) {
      const attrs = nodeAttributes(issue, issues);
      lines.push(`    ${dotId(issue.number)} [label=${dotString(`${dotIssuePrefix(issue)}\\n${issue.title}`)}, fillcolor="${attrs.fill}", color="${attrs.stroke}", fontcolor="${attrs.font}", URL=${dotString(issue.url)}];`);
      emitted.add(issue.number);
    }
    lines.push('  }');
  }
  for (const { goalpost } of modelGoalposts()) {
    const issue = issues.get(goalpost.number);
    for (const blocker of issue?.blockedBy?.nodes ?? []) {
      const liveBlocker = issues.get(blocker.number) ?? blocker;
      const blockerOpen = liveBlocker.state !== 'CLOSED';
      const color = blockerOpen ? '#bd2c00' : '#248232';
      const penwidth = blockerOpen ? '3.2' : '1.4';
      const label = blockerOpen ? 'BLOCKED' : 'OPEN';
      lines.push(`  ${dotId(blocker.number)} -> ${dotId(goalpost.number)} [label=${dotString(label)}, color="${color}", penwidth=${penwidth}, style=solid];`);
    }
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function ensureDocsDir() {
  const dir = dirname(DAG_SVG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function renderSvgStringFromDotFile() {
  return run('dot', ['-Tsvg', DAG_DOT_PATH]);
}

function renderSvg(dot) {
  ensureDocsDir();
  writeFileSync(DAG_DOT_PATH, dot);
  run('dot', ['-Tsvg', DAG_DOT_PATH, '-o', DAG_SVG_PATH]);
}

function generate() {
  const issues = fetchIssues();
  const markdown = buildMarkdown(issues);
  const dot = buildDot(issues);
  writeFileSync(ROADMAP_PATH, markdown);
  renderSvg(dot);
  return { issues, markdown, dot };
}

function firstDifference(name, actual, expected) {
  const actualLines = actual.split(/\r?\n/);
  const expectedLines = expected.split(/\r?\n/);
  const maxLines = Math.max(actualLines.length, expectedLines.length);
  for (let index = 0; index < maxLines; index += 1) {
    if (actualLines[index] === expectedLines[index]) {
      continue;
    }
    return [
      `${name} first differs at line ${index + 1}.`,
      `expected: ${expectedLines[index] ?? '(missing)'}`,
      `actual:   ${actualLines[index] ?? '(missing)'}`,
    ].join('\n');
  }
  return `${name} differs but no line-level mismatch was found.`;
}

function check() {
  const issues = fetchIssues();
  const expectedMarkdown = buildMarkdown(issues);
  const expectedDot = buildDot(issues);
  const actualMarkdown = readFileSync(ROADMAP_PATH, 'utf8');
  const actualDot = readFileSync(DAG_DOT_PATH, 'utf8');
  const actualSvg = existsSync(DAG_SVG_PATH) ? readFileSync(DAG_SVG_PATH, 'utf8') : '';
  const missing = missingDesiredEdges(issues);
  const failures = [];
  if (actualMarkdown !== expectedMarkdown) {
    failures.push(`ROADMAP.md is not generated from current GitHub issue state. Run \`npm run roadmap:generate\`.\n${firstDifference('ROADMAP.md', actualMarkdown, expectedMarkdown)}`);
  }
  if (actualDot !== expectedDot) {
    failures.push(`docs/roadmap-dag.dot is not generated from current GitHub issue state. Run \`npm run roadmap:generate\`.\n${firstDifference('docs/roadmap-dag.dot', actualDot, expectedDot)}`);
  }
  if (!existsSync(DAG_SVG_PATH)) {
    failures.push('docs/roadmap-dag.svg is missing. Run `npm run roadmap:generate`.');
  } else if (actualDot === expectedDot && actualSvg !== renderSvgStringFromDotFile()) {
    failures.push('docs/roadmap-dag.svg is not rendered from current docs/roadmap-dag.dot. Run `npm run roadmap:generate`.');
  }
  if (missing.length > 0) {
    const details = missing.map((edge) => `#${edge.blocker} must block #${edge.blocked}`).join('\n');
    failures.push(`GitHub native issue dependency edges are missing:\n${details}\nRun \`npm run roadmap:sync -- --apply\` if this planned sequence is still correct.`);
  }
  if (failures.length > 0) {
    console.error(failures.join('\n\n'));
    process.exitCode = 1;
  }
}

function sync(apply) {
  const issues = fetchIssues();
  const missing = missingDesiredEdges(issues);
  if (missing.length === 0) {
    console.log('Roadmap blocker edges are already synced.');
    return;
  }
  for (const edge of missing) {
    const blocker = issues.get(edge.blocker);
    const blocked = issues.get(edge.blocked);
    if (!blocker || !blocked) {
      throw new Error(`Cannot sync missing issue edge #${edge.blocker} -> #${edge.blocked}; issue data missing.`);
    }
    console.log(`${apply ? 'Adding' : 'Would add'} blocker edge: #${edge.blocker} blocks #${edge.blocked}`);
    if (apply) {
      graphql(
        `mutation AddRoadmapBlocker($issueId: ID!, $blockingIssueId: ID!) {
          addBlockedBy(input: {issueId: $issueId, blockingIssueId: $blockingIssueId}) {
            issue { number }
          }
        }`,
        { issueId: blocked.id, blockingIssueId: blocker.id },
      );
    }
  }
  if (!apply) {
    console.log('Dry run only. Re-run with --apply to update GitHub native issue dependencies.');
  }
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'generate') {
    generate();
  } else if (command === 'check') {
    check();
  } else if (command === 'sync') {
    sync(rest.includes('--apply'));
  } else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
