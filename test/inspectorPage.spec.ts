import test from "node:test";
import assert from "node:assert/strict";

import { ReintegrationDetailSummary } from "../src/app/ReintegrationDetailSummary.ts";
import { ReceiptShellSummary } from "../src/app/ReceiptShellSummary.ts";
import { buildReintegrationLines, buildReceiptShellLines } from "../src/tui/pages/inspectorPage.ts";

function makeDetail(): ReintegrationDetailSummary {
  return new ReintegrationDetailSummary({
    siteId: "site:head:test:2:wl:main",
    anchors: [{
      anchorId: "anchor:wl:main:primary",
      kind: "PRIMARY_LANE",
      laneId: "wl:main",
      worldlineId: "wl:main",
      summary: "Primary lane wl:main"
    }],
    obligations: [{
      obligationId: "obligation:test:admission",
      kind: "REWRITE_ADMISSION",
      status: "VIOLATED",
      summary: "wl:main rewrite admission violated"
    }],
    evidence: [{
      evidenceId: "evidence:test:1",
      obligationId: "obligation:test:admission",
      visibility: "RECEIPT_DIGEST",
      summary: "receipt:test:1 (digest:test)"
    }],
    summary: "1 anchor(s), 1 obligation(s), 1 evidence handle(s)"
  });
}

function makeShell(): ReceiptShellSummary {
  return new ReceiptShellSummary({
    siteId: "site:head:test:2:wl:main",
    receiptIds: ["receipt:test:1"],
    candidateCount: 4,
    rejectedCount: 1,
    hasBlockingRelation: true,
    summary: "4 candidate(s), 1 rejected, blocking"
  });
}

test("buildReintegrationLines renders anchor, obligation, and evidence summaries", () => {
  const lines = buildReintegrationLines(makeDetail());

  assert.match(lines, /Site: site:head:test:2:wl:main/);
  assert.match(lines, /Anchor: PRIMARY_LANE wl:main/);
  assert.match(lines, /Obligation: REWRITE_ADMISSION \[VIOLATED\]/);
  assert.match(lines, /Evidence: RECEIPT_DIGEST evidence:test:1/);
});

test("buildReceiptShellLines renders shell counters and receipt ids", () => {
  const lines = buildReceiptShellLines(makeShell());

  assert.match(lines, /Candidates: 4/);
  assert.match(lines, /Rejected: 1/);
  assert.match(lines, /Blocking: yes/);
  assert.match(lines, /Receipt: receipt:test:1/);
});
