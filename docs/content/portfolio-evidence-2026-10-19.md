# Portfolio evidence and editorial update (2026-10-19)

This is an **unpublished staging change**. It adds reviewable, original, editable SVG diagrams. It does not create CMS records, alter live content, claim hardware field validation, or authorize publication.

## Added assets

| Source path | Intended CMS placement | Exact editorial boundary |
|---|---|---|
| `/projects/sismo-smart/sensor-to-alert.svg` | Existing Sismo Smart: candidate cover/media | Conceptual public sensor-to-operator overview. Not a hardware wiring schematic, release topology, response-time measurement, or seismic certification. |
| `/projects/boardreadyops/release-evidence.svg` | New BoardReadyOps private project draft | KiCad source, native checks, reviewable evidence and human release boundary. Signatures do not alone establish source-to-export provenance. |
| `/projects/zaptrace/validation-pipeline.svg` | New ZapTrace private project draft | Experimental pre-1.0 workflow. Template-assisted paths and evidence packs are not proofs of working circuit designs or manufacturing readiness. |
| `/projects/fovux/dataset-to-edge.svg` | New Fovux private project draft | Dataset-through-export workflow. Target-device metrics and model accuracy require measured benchmarks. |

The SVGs use accessible `title` and `desc` text, a scalable 1600x900 viewBox, no remote resources, and no embedded scripts or customer-specific details. Captions must identify them as conceptual illustrations, not real UI captures.

## Source evidence

- BoardReadyOps: https://github.com/oaslananka/boardreadyops ; verify published npm/Marketplace status before adding release-version claims.
- ZapTrace: https://github.com/oaslananka/zaptrace ; README includes pre-1.0 limitations and a feature-status matrix.
- Fovux: https://github.com/oaslananka/fovux-kit ; check actual Python and VS Code package releases before assigning version numbers.
- Sismo Smart: existing public privacy-safe case study. Do not import private deployment details.

## Controlled CMS rollout

1. Review these assets and run SVG parse/visual/accessibility checks in CI; merge only after required PR checks pass.
2. Verify the four public URLs serve SVGs from the deployed commit with HTTP 200.
3. Stage three separate CMS project **proposals** for BoardReadyOps, ZapTrace and Fovux using their reviewed draft payloads, distinct idempotency keys and `If-None-Match: *`.
4. The owner explicitly reviews each proposal in `/admin/agent-approvals`; apply one exact signed approval per new draft with `POST /api/agent/v1/projects`. The Ops writer connection must have a separately reviewed, narrow POST-project allow rule.
5. Verify every new project has `published=false`, `featured=false`, revision 1, one recorded write and a public detail URL returning HTTP 404. Do not publish without a separate owner approval.
6. Handle changes to already published Sismo Smart and the archived SkyTrackVision / IoT Cloud Monitor case studies through separate revision-checked proposals. The GitHub repositories for the latter two are archived, so the case studies should explicitly say so.

## Acceptance and scope

- No SQL migrations, production database switch, credentials, analytics changes, or homepage reorganization.
- Do not automatically merge this PR or publish a CMS entry.
- No invented performance statistics, user/customer claims, independent certification or fabricated interface screenshots.
- Editorial payloads and preview PNGs are kept separately in the local preparation bundle until reviewed.

Issue tracking: #45 remains a separate API write and approval workstream.
