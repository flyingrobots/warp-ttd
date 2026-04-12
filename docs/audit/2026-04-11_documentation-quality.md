# AUDIT: DOCUMENTATION QUALITY (2026-04-11)

## 1. ACCURACY & EFFECTIVENESS ASSESSMENT

- **1.1. Core Mismatch:**
    - **Answer:** The root `README.md` implies full protocol v0.5.0 support, but the `gitWarpAdapter.ts` still returns hardcoded empty lists for `deliveryObservations`. The protocol surface is "implemented" but the data bridge is still a placeholder.

- **1.2. Audience & Goal Alignment:**
    - **Answer:**
        - **Target Audience:** Systems engineers building causal substrates and investigator-mode users.
        - **Top 3 Questions addressed?**
            1. **"How do I see what happened?"**: Yes (TUI and CLI frame inspection).
            2. **"How do I build an adapter?"**: Partial (Port is defined, but lifecycle docs are thin).
            3. **"Is it portable?"**: Yes (Multi-host pitch in README).

- **1.3. Time-to-Value (TTV) Barrier:**
    - **Answer:** The requirement for `--experimental-strip-types` is the primary bottleneck. A user following the README might forget the flag if they aren't using the provided `npm run` scripts.

## 2. REQUIRED UPDATES & COMPLETENESS CHECK

- **2.1. README.md Priority Fixes:**
    1. **Wrapper Script**: Introduce a root-level binary that hides the `strip-types` complexity.
    2. **Capability Table**: Explicitly list which capabilities (Fork, Seek, Effects) are supported by which host adapters today.
    3. **Wesley Workflow**: Clarify that protocol changes *must* happen in the Wesley schema first.

- **2.2. Missing Standard Documentation:**
    1. **`SECURITY.md`**: Missing. Needs to address the risk of "Time-Travel Replay" exposing historical secrets or PII stored in WARP patches.
    2. **`CONTRIBUTING.md`**: Exists, but needs to be aligned with the newly established `METHOD.md` manifests.

- **2.3. Supplementary Documentation (Docs):**
    - **Answer:** **Host Adapter Lifecycle**. A dedicated doc explaining the expected behavior of `playbackHead`, `frame`, and `step` operations, specifically around the "Frame 0" synthetic genesis frame.

## 3. FINAL ACTION PLAN

- **3.1. Recommendation Type:** **A. Incremental updates to the existing README and documentation.** (The core manifests are now authoritative; they need depth alignment).

- **3.2. Deliverable (Prompt Generation):** `Align all host-adapter capability claims with current implementation status. Create 'docs/ADAPTER_DEVELOPMENT.md' explaining the genesis-frame contract. Refine CONTRIBUTING.md to point to METHOD.md.`

- **3.3. Mitigation Prompt:** `Update root README.md to include a Host Capability Matrix (Echo vs. git-warp). Create a new manifest 'docs/ADAPTER_DEVELOPMENT.md' detailing the state-machine requirements for TtdHostAdapter implementations, specifically the transition from frame 0 to frame 1 and how to handle Lamport tick gaps. Create a basic SECURITY.md manifest.`
