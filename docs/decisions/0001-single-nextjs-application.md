# ADR 0001: Keep one Next.js application as the deployment unit

- Status: Accepted
- Date: 2026-09-04

## Context

The repository serves a public portfolio, machine-readable Markdown/agent discovery, an authenticated admin panel, scheduled endpoints, and database-backed content. These surfaces share deployment configuration, data contracts, security policy, and a relatively small operational footprint.

## Decision

Keep the system as one Next.js application with explicit internal boundaries instead of splitting it into independent services.

- `app/` owns routing and composition.
- `components/` owns presentation and client interaction.
- `lib/` owns reusable domain, policy, security, integration, and server logic.
- `lib/db/` owns database schema/access and remains server-side.
- `scripts/` owns operational/build verification entry points.
- `tests/` and `e2e/` encode executable behavior and architecture invariants.

Sensitive boundaries are protected with focused tests and CI rather than network hops between services.

## Consequences

Benefits: one deployment pipeline, fewer credentials and failure modes, straightforward local reproduction, and cheap end-to-end testing. Costs: module discipline matters more because process boundaries do not prevent accidental coupling.

## Guardrails

Do not introduce a new service, queue, cache, or deployment unit unless there is measured evidence that the existing application cannot meet a reliability, security, scaling, ownership, or delivery requirement. A proposal must identify the failing constraint, expected benefit, added operational cost, migration/rollback plan, and how the new boundary will be tested.

The current architecture map is `docs/ARCHITECTURE.md`; material boundary changes require a new ADR rather than silently editing this decision.
