# Wesley-Generated Echo Family Consumer

Source design cycle:
[0033-wesley-generated-echo-family-consumer](../design/0033-wesley-generated-echo-family-consumer/wesley-generated-echo-family-consumer.md)

## Reader Contract

`jedit` live Echo family intake can now report whether it can see declared
Wesley-generated Continuum Echo inspect artifacts.

The rule is:

> Generated artifact visibility is evidence posture, not an Echo session,
> native Continuum witness, admission ticket, grant, or payload hydration.

WARP TTD reports generated-family consumption only when the `jedit` manifest
declares generated artifact descriptors and every required generated file exists
under the target root.

## Manifest Extension

The live Echo family manifest remains:

`<jedit root>/.warp-ttd/live-echo-family-facts.json`

It may now include `generatedFamilyArtifacts`:

```json
{
  "schemaVersion": "warp-ttd.live-echo-family-intake.v1",
  "publishedFields": ["neighborhoodCore"],
  "generatedFamilyArtifacts": [
    {
      "family": "continuum",
      "target": "echo-inspect",
      "schemaVersion": "continuum.echo.inspect-ir/v1",
      "artifactRoot": "dist/generated/continuum-echo-inspect",
      "requiredFiles": [
        "schemas.generated.ts",
        "ops.generated.ts",
        "client.generated.ts"
      ]
    }
  ]
}
```

`artifactRoot` and `requiredFiles` are target-root-relative paths. Absolute
paths and `..` traversal are invalid.

## What Agents See

Run:

```sh
npm run targets -- --json
```

or inspect MCP `warp_ttd.inspect_live_targets`.

For `jedit`, the output includes:

- `sessionFamilyIntake.generatedFamilyConsumption.consumerPosture`
- `sessionFamilyIntake.generatedFamilyConsumption.artifactPosture`
- `sessionFamilyIntake.generatedFamilyConsumption.artifacts`
- `artifacts[].artifactRoot`
- `artifacts[].requiredFiles`
- `artifacts[].presentFiles`
- `artifacts[].missingFiles`
- `reason`

## Posture Meanings

- `consumerPosture: "GENERATED_FAMILY_PRESENT"` means the descriptor is valid
  and every required generated file exists.
- `consumerPosture: "GENERATED_FAMILY_UNAVAILABLE"` means the manifest
  declared generated artifacts, but required files are missing.
- `consumerPosture: "LOCAL_MIRROR_FALLBACK"` means no generated artifact
  descriptor was advertised, so WARP TTD stays on the explicit local mirror
  boundary.
- `artifactPosture: "PRESENT"` means every required file for the declared
  artifacts was observed.
- `artifactPosture: "ABSENT"` means no generated artifact descriptor was
  advertised.
- `artifactPosture: "OBSTRUCTED"` means the declared generated artifact path or
  files cannot be used.

## Compatibility Rule

Existing manifests with only `publishedFields` remain valid. They continue to
report `LOCAL_MIRROR_FALLBACK`.

Fixtures and `graft` do not claim generated Echo family consumption in this
slice.

## Ownership Rule

Continuum and Echo own the generated proof-family artifacts. WARP TTD owns only
the debugger read model that reports whether those artifacts are visible from a
target root.

Do not extend `src/protocol.ts` with proof-family nouns just to make this
inspection convenient.

## Safety Boundaries

- No generated artifacts are checked into WARP TTD.
- No generated modules are executed.
- No Echo session open.
- No generated codec hydration.
- No grant issuance.
- No `CapabilityPresentation` construction.
- No runtime admission.
- No host mutation.
- No native Continuum witnesshood inferred from file presence.
