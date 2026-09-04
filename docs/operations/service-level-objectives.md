# Service-level objectives

These are engineering targets and operational decision rules. They are not claims that an external monitoring system currently proves the targets over a rolling window.

## Public site

| Signal | Objective | Evidence / action |
| --- | --- | --- |
| Availability | 99.9% successful public responses over 30 days | Vercel/Sentry or external uptime evidence; investigate sustained 5xx or routing failures |
| Deployment health | Every production deployment reaches a healthy public homepage and expected admin perimeter behavior | Verify public `200`, admin redirect/access behavior, and security headers after production changes |
| Error regressions | No unexplained sustained increase in server/client error rate after a deployment | Sentry release comparison and rollback when a deployment is the causal change |

## Contact delivery

| Signal | Objective | Evidence / action |
| --- | --- | --- |
| Durable acceptance | A valid contact submission is stored before optional email delivery | Application/database tests |
| Duplicate prevention | Provider retries use a stable idempotency key and exclusive claims | Worker/database tests |
| Terminal failures | Terminal delivery failures are visible without attaching message content to telemetry | Sentry and admin delivery-state review |

## Recovery

- Database migration/preflight must pass before a production build that requires production parity.
- The restore-drill contract must remain green in protected CI.
- A production database incident follows `neon-recovery.md`; recovery evidence includes application health, admin access, contact delivery, sitemap, and monitoring.

## Alert and rollback policy

A release is a rollback candidate when it introduces reproducible 5xx responses, breaks authentication or the admin perimeter, prevents contact persistence, violates database migration parity, or causes a material client/server error regression. Rollback or forward-fix decisions must preserve database compatibility and evidence.

## Current measurement gap

The repository defines the targets and executable synthetic/build checks, but provider-level rolling SLI dashboards and alert thresholds are externally controlled and are not independently verified by this repository. Do not describe the 99.9% target as achieved until a rolling-window monitor is connected and reviewed.
