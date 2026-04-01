# Release Discipline

Releases happen **only from main**, **only after merging**, and **only
after the CHANGELOG and version are correct**.

## Release Flow

1. Do work on a cycle branch.
2. Update `CHANGELOG.md` and `package.json` version on the branch.
3. Push the branch, open a PR to main.
4. Do review loops until merge is accepted.
5. Merge the PR.
6. Sync local main to `origin/main`.
7. Verify the version and CHANGELOG are correct on main.
8. Tag the merge commit: `git tag -a vX.Y.Z -m "vX.Y.Z — <title>"`
9. Push the tag: `git push origin vX.Y.Z`

That is the entire release. CI handles the rest once workflows are
configured.

## Rules

- **Never tag a branch.** Tags go on main, after merge.
- **Never tag before the PR is merged.** The merge commit is the
  release commit.
- Maintain `CHANGELOG.md` with every release.
- The first real cycle release starts at `0.1.0`.
- The version/tag should reflect cycle reality, not aspirational scope.

## Examples

- `v0.1.0`
- `v0.2.0`
