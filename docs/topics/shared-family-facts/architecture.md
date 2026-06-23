# Shared-Family Facts architecture

## Purpose

Shared-family facts define how host-provided and generated family metadata is merged into session snapshots with deterministic precedence.

## Ingestion flow

1. Family fact inputs are loaded from session and host sources.
2. Fact posture is normalized for malformed or missing metadata.
3. Host/legacy values are merged according to precedence policy.
4. Normalized facts are attached to snapshots for downstream observability and renderer consumers.

## Data ownership

- `src/app/generatedFamilyIngress.ts` normalizes source facts.
- `src/app/sharedFamilyHydration.ts` applies stable merging behavior.
- `src/app/sessionFamilyFacts.ts` publishes facts to the session model.

## Failure posture

Most user-visible failures are missing precedence or coercion bugs:
- malformed host metadata can become silent omission,
- local facts can accidentally shadow canonical host facts,
- posture checks can be dropped when inputs are incomplete.

These failures are checked through ingestion and session-family tests before merge.

