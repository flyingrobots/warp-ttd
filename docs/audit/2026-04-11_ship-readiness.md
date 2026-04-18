# AUDIT: READY-TO-SHIP ASSESSMENT (2026-04-11)

### 1. QUALITY & MAINTAINABILITY ASSESSMENT (EXHAUSTIVE)

1.1. **Technical Debt Score (1-10):** 2
    - **Justification:**
        1. **Concurrent Snapshot Overheads**: `DebuggerSession` currently performs six sequential async calls on every step, which is a latent performance risk for high-latency adapters.
        2. **God Function (`gitWarpAdapter.create`)**: The factory function re-materializes the entire graph just to build the initial frame index.
        3. **Wesley Vendoring**: The protocol types in `protocol.ts` are a manual mirror, creating a "two-sources-of-truth" risk until full Wesley vendoring is automated.

1.2. **Readability & Consistency:**
    - **Issue 1:** `gitWarpAdapter.ts` uses structural typing for `WarpCoreLike` instead of the official `WarpCore` class. While good for tests, it hides some available substrate capabilities from the IDE.
    - **Mitigation Prompt 1:** `Refine the WarpCoreLike interface to include @link references to the official git-warp documentation, ensuring developers can find the substrate implementation details easily.`
    - **Issue 2:** The TUI uses different key-naming conventions (`n`/`p` for forward/back) than the protocol (`stepForward`/`stepBackward`).
    - **Mitigation Prompt 2:** `Align the TUI key-help text with the protocol terminology (e.g. 'n: Step Forward') to reinforce the system's geometric lawfulness.`
    - **Issue 3:** Error handling in `fetchSnapshot` is "fail-fast." If one port (e.g. `effectEmissions`) fails, the entire session snapshot is lost.
    - **Mitigation Prompt 3:** `Implement a 'Resilient Fetch' in DebuggerSession that uses settled promises, allowing the session to display partial data (e.g. Frame + Receipts) even if an auxiliary port fails.`

1.3. **Code Quality Violation:**
    - **Violation 1: SRP (`buildFrameIndex`)**: This function groups receipts by tick AND sorts the final index in a single pass.
    - **Violation 2: SRP (`toReceiptSummary`)**: This helper calculates op counts (admitted/rejected) while also formatting the summary string.
    - **Violation 3: SoC (`cli.ts`)**: The CLI entrypoint handles command parsing, session creation, and JSONL formatting in one large script.

### 2. PRODUCTION READINESS & RISK ASSESSMENT (EXHAUSTIVE)

2.1. **Top 3 Immediate Ship-Stopping Risks (The "Hard No"):**
    - **Risk 1: Head State Drift (High)**: If an external process moves the playback head in the host substrate, the TTD `DebuggerSession` remains on a stale snapshot without a formal version-check.
    - **Mitigation Prompt 7:** `Add a 'tick' or 'digest' field to the PlaybackHeadSnapshot and verify it in the session loop before performing any controlled step, ensuring investigation integrity.`
    - **Risk 2: Node-Specific Adapter (Medium)**: `gitWarpAdapter.ts` relies on `node:module` for versioning, which will crash in Deno or Bun environments despite the "host-neutral" claim.
    - **Mitigation Prompt 8:** `Remove 'createRequire' from the gitWarpAdapter and move version resolution to the factory level, ensuring the core adapters remain runtime-agnostic.`
    - **Risk 3: Unhandled Async in TUI (Low)**: Rapid key-presses in the TUI can trigger overlapping `stepForward` calls, potentially leading to out-of-order frame displays.
    - **Mitigation Prompt 9:** `Implement an 'Async Guard' or 'Request Debounce' in the TUI controller that prevents new session operations until the previous one has settled.`

2.2. **Security Posture:**
    - **Vulnerability 1: Historical Data Leak**: The "Wide-Aperture" mission allows the debugger to see every rejected counterfactual. If those patches contained secrets, TTD will surface them honestly to anyone with adapter access.
    - **Mitigation Prompt 10:** `Implement an 'Aperture Policy' that redacts sensitive property keys (e.g. 'apiKey', 'privateKey') from the effect-emission summaries at the adapter level.`
    - **Vulnerability 2: Command Injection via --json**: Malicious JSONL input from a compromised host could theoretically exploit the CLI's parsing logic.
    - **Mitigation Prompt 11:** `Ensure that all CLI JSONL parsing uses the Wesley-generated Zod validators to enforce strict protocol envelope shapes before processing.`

2.3. **Operational Gaps:**
    - **Gap 1: Latency SLO**: No automated benchmarks for "Snapshot Latency" over high-latency adapters.
    - **Gap 2: Protocol Compatibility**: No check to ensure the local `protocol.ts` hasn't drifted from the `.graphql` schema during a cycle.
    - **Gap 3: Remote Logs**: No path to pipe investigator "pins" or "witnesses" to a central audit log.

### 3. FINAL RECOMMENDATIONS & NEXT STEP

3.1. **Final Ship Recommendation:** **YES.** (The codebase is exceptionally clean and disciplined. The risks are primarily multi-user/multi-runtime scaling concerns).

3.2. **Prioritized Action Plan:**
    - **Action 1 (High Urgency):** Parallelize snapshot fetching in `DebuggerSession`.
    - **Action 2 (Medium Urgency):** Remove Node-specific leaks from `gitWarpAdapter`.
    - **Action 3 (Low Urgency):** Implement resilient fetch for partial snapshot displays.
