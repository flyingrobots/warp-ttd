# Retrospective — Cycle 0006: Design Vocabulary

## What shipped

1. **Canonical glossary** (`docs/glossary.md`) — 11 domain terms with
   definitions, anti-patterns, and a dedicated frame-vs-tick decision.
2. **CONTRIBUTING.md restructured** — split from a 474-line megadoc
   into a practical front door linking to four focused documents:
   - `docs/doctrine.md` — project philosophy and guardrails
   - `docs/glossary.md` — canonical terminology
   - `docs/cycle-process.md` — maintainer cycle loop
   - `docs/release.md` — release discipline
3. **Glossary contract test** (`test/glossary.spec.ts`) — 3 assertions
   verifying the glossary exists, contains all required terms, and
   documents the frame/tick distinction.
4. **Design doc 0010** documenting the vocabulary audit results and
   the frame-vs-tick decision.

## Drift check

The original backlog item (`docs/backlog/design-vocabulary.md`)
proposed:

- Audit all user-visible strings — **done, found zero violations**
- Audit protocol type names — **done, all correct**
- Establish a canonical glossary — **done**
- Resolve the `frameIndex` → `tickIndex` tension — **done, decided no**

The scope expanded during human playback to include restructuring
CONTRIBUTING.md into separate docs. This was not in the original
backlog item but emerged from the editorial review as the right thing
to do while touching these docs. Intentional drift — the glossary
needed a home, and the megadoc needed surgery.

## What worked

- **Full codebase audit before writing code.** The audit revealed the
  vocabulary was already correct, which reframed the cycle from
  "rename things" to "formalize and restructure." Saved significant
  rework.
- **Human editorial review as playback.** James's feedback on
  CONTRIBUTING.md was more valuable than the original hill. The
  restructuring made the project documentation sharper, not just the
  glossary.
- **Test-as-spec for docs.** The glossary contract test is unusual but
  effective — it prevents the glossary from silently losing terms.

## What didn't work

- **Original scope was too narrow.** The backlog item assumed
  vocabulary corrections were needed. The audit showed they weren't.
  The real value was in formalization and restructuring, which wasn't
  anticipated.

## What was learned

- Vocabulary audits should happen early and often. Catching the
  frame/tick distinction now — while the codebase has ~50 files —
  prevents a much larger rename surface later.
- CONTRIBUTING.md is a high-leverage document. Its structure affects
  how seriously contributors (and agents) take the project's
  standards. A sharp front door with linked depth is better than a
  monolith.
- The "IBM Design Thinking" brand was unnecessary. The ideas (sponsor
  human, sponsor agent, hills, playback) are strong on their own.

## Tech/design debt

None discovered.

## Cool ideas

None surfaced.
