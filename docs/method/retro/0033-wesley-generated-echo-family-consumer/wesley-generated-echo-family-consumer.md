# Wesley-Generated Echo Family Consumer Retro

Cycle: `0033-wesley-generated-echo-family-consumer`

Issue: https://github.com/flyingrobots/warp-ttd/issues/68

PR: https://github.com/flyingrobots/warp-ttd/pull/75

## What Changed From The Design

The design held. The implementation uses a manifest-declared generated artifact
descriptor instead of checking generated artifacts into WARP TTD or dynamically
importing target code.

The only material clarification is that malformed descriptor paths obstruct the
manifest intake itself, while declared-but-missing files keep the manifest
present and report generated-family unavailability through
`generatedFamilyConsumption`.

## What The Tests Proved

- `inspectLiveEchoFamilyIntake` reports `GENERATED_FAMILY_PRESENT` only when a
  descriptor is valid and every required generated file exists.
- Existing manifests without `generatedFamilyArtifacts` remain compatible and
  report `LOCAL_MIRROR_FALLBACK`.
- Declared generated artifacts with missing files report
  `GENERATED_FAMILY_UNAVAILABLE` and list `missingFiles`.
- Absolute or unsafe generated artifact paths obstruct the manifest instead of
  escaping the target root.
- `targets --json` exposes the same generated-family consumer posture for
  agents.
- MCP `warp_ttd.inspect_live_targets` exposes the same read-only posture.
- Manual and ontology guards preserve the operator contract.

## What Remains Open

- WARP TTD still does not hydrate session payloads through generated codecs.
- WARP TTD still does not open an Echo runtime session.
- `jedit` must still publish real generated artifact descriptors in its live
  root for non-fixture acceptance.
- Follow-on Echo host adapter and generated protocol authority work remain in
  GitHub issues #62 and #64.

## Safety Boundaries Preserved

- No generated artifacts are checked into WARP TTD.
- No generated modules are executed.
- No Echo session is opened.
- No grant is issued.
- No `CapabilityPresentation` is constructed.
- No runtime admission is performed.
- No host mutation occurs.
- No native Continuum witnesshood is inferred from file presence.
