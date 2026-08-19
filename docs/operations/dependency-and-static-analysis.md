# Dependency automation and static analysis

## Supported toolchain

The repository supports Node.js `22.23.1` and npm `10.9.8`. The versions are declared in `package.json`, `.nvmrc`, and `.node-version`. CI installs dependencies only with `npm ci`.

## Renovate

`renovate.json` is the source of truth for dependency automation. Dependabot is intentionally disabled to prevent duplicate update pull requests.

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

CodeQL, Qlty, OSV Scanner, TruffleHog, Zizmor, ShellCheck, actionlint, Semgrep Community Edition, npm audit, branch protection, and the application test suites are complementary. SonarQube Cloud may supplement them while free capacity is available, but the repository remains fully protected without it.
