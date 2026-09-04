# Free quality gate

The repository does not depend on a paid static-analysis service for merges.

## Required checks

The protected `main` branch requires these free checks:

- `build`: TypeScript, ESLint, unit tests with critical-module coverage thresholds, database migration/preflight, Next.js build, homepage density, and the Chromium Playwright suite.
- `Analyze JavaScript / TypeScript`: GitHub CodeQL with the `security-extended` query suite.
- `restore-drill`: the Neon restore procedure contract.
- `production-audit`: high-severity production dependency audit.
- `osv-scanner`: OSV Scanner database scan across the repository dependency manifests, with SARIF upload.
- `pre-commit`: repository-wide pre-commit policy checks.
- `semgrep`: Semgrep Community Edition with JavaScript, TypeScript, Next.js, and OWASP rules.
- `sbom`: lockfile-derived CycloneDX SBOM generation and JSON validation; pushes to `main` additionally attest the SBOM provenance.
- `visual-regression`: deterministic Chromium visual baselines.

These checks are the merge boundary. A pull request must be current with `main` and pass every required check.

## SonarQube Cloud

SonarQube Cloud is advisory and is not a required status check. Its workflow runs only on manual dispatch and a monthly schedule. Scanner failure, quota exhaustion, or service unavailability does not weaken or block the free required quality gate.

The advisory project may be used to review maintainability findings while free organization capacity remains available. Do not exclude real application source solely to fit a hosted quota.

## Local verification

Run the closest local equivalent before opening a pull request:

```bash
npm run verify
npm audit --omit=dev --audit-level=high
osv-scanner scan source -r .
pre-commit run --all-files --show-diff-on-failure
semgrep scan --config p/javascript --config p/typescript --config p/nextjs --config p/owasp-top-ten --error --metrics=off
```

Browser-facing changes also require:

```bash
npm run build
npm run test:e2e
npm run test:e2e:visual
```

## Supply-chain artifact

The `Security checks` workflow generates a CycloneDX SBOM from the lockfile on pull requests, pushes to `main`, manual runs, and the weekly schedule. The artifact is retained for 30 days; pushes to `main` additionally create a GitHub artifact attestation for the SBOM file. SBOM generation and validation are part of the protected merge boundary through the required `sbom` status check.
