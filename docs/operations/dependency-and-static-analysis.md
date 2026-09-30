# Dependency automation and static analysis

## Supported toolchain

The repository supports Node.js `22.23.1` and npm `10.9.8`. The versions are declared in `package.json`, `.nvmrc`, and `.node-version`. CI installs dependencies only with `npm ci`.

## Dependabot

`.github/dependabot.yml` is the source of truth for routine version updates and security-update pull requests. It does not require a repository PAT or Actions secret.

Routine npm updates run weekly on Monday at 05:00 Europe/Istanbul with a seven-day release cooldown and a five-PR version-update limit. The policy keeps Next.js/React, Drizzle, and Sentry compatibility families together, groups low-risk development patch updates, and leaves other updates individually reviewable. Security updates are grouped separately and are not delayed by the routine version-update cooldown. `@types/node` major updates are ignored while the repository runtime remains pinned to Node 22; change that guard only as part of a coordinated Node runtime/toolchain major upgrade.

GitHub Actions are checked separately every Monday at 05:30 Europe/Istanbul, also with a seven-day cooldown. Workflow actions stay pinned to immutable commit SHAs; Dependabot updates supported SHA references and their same-line version comments rather than replacing the repository's pinning policy.

Every dependency PR follows the normal protected `main` path. GitHub branch protection and repository rulesets require human approval and the same required CI/security checks as other pull requests, so dependency automation has no merge bypass. The retired Renovate-only dashboard approval, standalone lockfile-maintenance job, and dev-only automerge behavior are intentionally not reproduced; lockfile changes are reviewed with the dependency PR that generated them.

## Local hooks

Install and enable the repository hooks:

```bash
python -m pip install --only-binary=:all: --require-hashes --requirement requirements-security.txt
pre-commit install --install-hooks
pre-commit install --hook-type pre-push
```

Pre-commit runs deterministic file hygiene and ESLint. Pre-push adds TypeScript and unit-policy tests. Semgrep runs separately in CI from an immutable official container image, so local hook installation is helpful but not a trust boundary.

## Semgrep

The `Security checks` workflow runs Semgrep Community Edition from the official `semgrep/semgrep` container pinned by OCI digest against the JavaScript, TypeScript, Next.js, and OWASP rulesets. Findings are uploaded as SARIF to GitHub code scanning. The workflow is tokenless and active for pull requests, pushes to `main`, manual runs, and a weekly schedule.

## SonarQube Cloud

SonarQube Cloud is an optional maintainability dashboard. The workflow is manual plus monthly, uses `continue-on-error`, and is not part of branch protection. Hosted quota or service failures must not block merges. The required free boundary is documented in [the quality-gate runbook](./quality-gate.md).

## Existing security layers

CodeQL, OSV Scanner, Semgrep Community Edition, npm audit, branch protection, and the application test suites are complementary. SonarQube Cloud may supplement them while free capacity is available, but the repository remains fully protected without it.

## OSV Scanner

`osv-scanner scan source -r .` scans the npm lockfile and Python security-tool requirements against the OSV database. The `Security checks` workflow runs the same repository-wide scan from the official OSV Scanner action pinned to an immutable commit and uploads SARIF to GitHub code scanning. Findings fail the job; do not suppress a finding merely to make CI green.

The Python security-tool requirements fully lock the pre-commit toolchain by exact version and wheel SHA-256. CI installs it with `--require-hashes --only-binary=:all:`. Semgrep is intentionally isolated from this Python manifest and runs from its pinned container. Refresh the lock only after pip resolution and OSV Scanner are clean.

## SBOM

`npm run sbom` uses npm's lockfile-aware CycloneDX generator. The `Security checks` workflow validates the JSON and uploads `sbom.cdx.json` as a 30-day artifact. Pushes to `main` additionally create a GitHub artifact attestation for that exact SBOM file. The generated file is ignored locally and must not be hand-edited or committed.

## Coverage enforcement

The main CI build runs `npm run test:coverage`. The selected high-risk modules must retain at least 95% statements/lines/functions and 80% branches. This is a focused critical-module fitness function, not a claim of whole-repository coverage.
