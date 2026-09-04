# Dependency automation and static analysis

## Supported toolchain

The repository supports Node.js `22.23.1` and npm `10.9.8`. The versions are declared in `package.json`, `.nvmrc`, and `.node-version`. CI installs dependencies only with `npm ci`.

## Renovate

`renovate.json` is the source of truth for routine dependency automation. Dependabot is configured separately for security updates only; its routine version PRs are disabled with `open-pull-requests-limit: 0`, while security-update PRs remain enabled.

Renovate validates its configuration every Monday and on manual dispatch. A scheduled bot run additionally requires a fine-grained `RENOVATE_TOKEN` repository secret with read/write access to repository contents, pull requests, and issues. The Mend-hosted Renovate GitHub App can be used instead; when it is installed, it reads the same `renovate.json` file.

The policy groups compatibility-sensitive packages, pins GitHub Actions by digest, requires dashboard approval for major and Drizzle updates, delays normal releases for seven days, and only automerges patch/pin/digest updates to development dependencies after branch protections pass.

## Local hooks

Install and enable the repository hooks:

```bash
python -m pip install --requirement requirements-security.txt
pre-commit install --install-hooks
pre-commit install --hook-type pre-push
```

Pre-commit runs deterministic file hygiene and ESLint. Pre-push adds TypeScript, unit-policy tests, and Semgrep. CI runs the pre-commit stage over the entire repository, so local hook installation is helpful but not a trust boundary.

## Semgrep

The `Security checks` workflow runs Semgrep Community Edition against the JavaScript, TypeScript, Next.js, and OWASP rulesets. Findings are uploaded as SARIF to GitHub code scanning. The workflow is tokenless and active for pull requests, pushes to `main`, manual runs, and a weekly schedule.

## SonarQube Cloud

SonarQube Cloud is an optional maintainability dashboard. The workflow is manual plus monthly, uses `continue-on-error`, and is not part of branch protection. Hosted quota or service failures must not block merges. The required free boundary is documented in [the quality-gate runbook](./quality-gate.md).

## Existing security layers

CodeQL, OSV Scanner, Semgrep Community Edition, npm audit, branch protection, and the application test suites are complementary. SonarQube Cloud may supplement them while free capacity is available, but the repository remains fully protected without it.

## OSV Scanner

`osv-scanner scan source -r .` scans the npm lockfile and Python security-tool requirements against the OSV database. The `Security checks` workflow runs the same repository-wide scan from the official OSV Scanner action pinned to an immutable commit and uploads SARIF to GitHub code scanning. Findings fail the job; do not suppress a finding merely to make CI green.

The Python security-tool requirements pin Semgrep and pre-commit plus explicit safety floors for transitives that have had known vulnerabilities. Update those floors only after both pip resolution and OSV Scanner are clean.

## SBOM

`npm run sbom` uses npm's lockfile-aware CycloneDX generator. The `Security checks` workflow validates the JSON and uploads `sbom.cdx.json` as a 30-day artifact. Pushes to `main` additionally create a GitHub artifact attestation for that exact SBOM file. The generated file is ignored locally and must not be hand-edited or committed.

## Coverage enforcement

The main CI build runs `npm run test:coverage`. The selected high-risk modules must retain at least 95% statements/lines/functions and 80% branches. This is a focused critical-module fitness function, not a claim of whole-repository coverage.
