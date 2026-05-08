# Generated protocol authority cutover

The current protocol posture is explicitly transitional:

- the authored contract lives in GraphQL
- `src/protocol.ts` is still a handwritten local mirror
- the file itself says it should be replaced with Wesley-generated artifacts

That TODO has served its purpose. It now needs to become a deliberate cut.

## Why now

The stack has now clarified enough upstream:

- Continuum owns shared contract families
- Wesley should compile authored GraphQL into artifacts
- downstream repos should stop carrying hand-maintained mirrors forever

`warp-ttd` is a natural proving site for this cut because it is already
GraphQL/Wesley-oriented and already honest that the local mirror is temporary.

## Hill

`warp-ttd` stops treating `src/protocol.ts` as peer authority and consumes
generated protocol artifacts as the real contract surface.

## Done looks like

- the local mirror is retired or reduced to intentionally local wrappers only
- generated TypeScript artifacts are the primary protocol authority
- schema/version drift becomes compile-visible instead of comment-enforced
- adapter and app layers depend on the generated surface instead of the
  handwritten mirror

## Current proof slice

The repo now checks in the Rust-Wesley generated protocol artifact at
`src/generated/warp-ttd-protocol.wesley.generated.ts` and pins its root
operation metadata in `test/wesleyGeneratedProtocol.spec.ts`. That proves the
schema can be consumed by the Rust-native Wesley CLI and that root operation
names, query/mutation kind, and `wes_footprint` metadata survive generation.

This is intentionally not the full cutover yet. Custom scalar mappings still
need a generated policy before `src/protocol.ts` can be replaced without
weakening local types such as `Hash`, `Timestamp`, and `EffectKind`.

## Repo Evidence

- `src/protocol.ts`
- `src/generated/warp-ttd-protocol.wesley.generated.ts`
- `test/wesleyGeneratedProtocol.spec.ts`
- `docs/design/graphql-wesley-strategy.md`
- `docs/method/backlog/up-next/PROTO_wesley-generated-echo-family-consumption.md`
