# Release process

Releases are immutable records of protected `main`. Never tag an unmerged feature branch and never move an existing release tag.

## Prepare

1. Choose the next semantic version from the change scope.
2. Update `package.json`, `package-lock.json`, and `CHANGELOG.md` together.
3. Run the pinned toolchain and `npm run verify`.
4. Run the change-specific browser/database/security checks described in `CONTRIBUTING.md`.
5. Open a pull request and wait for every required branch-protection check.

## Publish

After the release PR is merged:

1. Confirm local/remote `main` points at the merge commit and is clean.
2. Create an annotated `v<version>` tag on that exact merge commit.
3. Push the tag without force.
4. Publish a GitHub Release from the immutable tag using the matching changelog section.
5. Record the merge SHA, tag, release URL, required-check evidence, SBOM/attestation evidence, and production deployment verification in `docs/ops/checkpoints/`.

## Supply-chain evidence

The security workflow generates a CycloneDX SBOM on pull requests and `main`. On `main`, the generated SBOM artifact receives a signed GitHub provenance attestation. A release checkpoint should reference the workflow run/attestation rather than copying generated SBOM files into Git.

## Rollback

Application regressions are corrected with a normal revert or forward fix through the protected pull-request path. Release tags remain immutable. If a published release needs correction, create a new patch release; do not retarget the old tag.

Production database changes require compatibility and recovery analysis before reverting application code. Follow `neon-recovery.md` for database incidents.
