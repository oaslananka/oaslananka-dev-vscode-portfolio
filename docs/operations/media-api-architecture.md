# Portfolio media API architecture and acceptance (#48)

Status: proposed, implementation behind an unmerged feature PR. No public deployment or new secret has been provisioned yet.

## Motivation and deployment boundary

The portfolio is a single Next.js app on Vercel with database-backed content; its local filesystem is not a durable upload destination. A new GitHub commit for each image triggers source-code CI/CD, which is inappropriate for routine content editing. The existing owned VPS has approximately 64 GiB disk headroom and an existing Cloudflare Tunnel Docker network named ops_internal. A small independently deployed media origin is the narrow exception to ADR 0001's single-application preference: **only immutable image bytes**, not CMS authorization, publication or business state, are moved out of Next.js.

Media origin: a standalone, non-root, read-only Docker container with a dedicated persistent volume on the owned VPS; no Docker host port. Later public hostname: exactly media.oaslananka.dev, routed only to the media service via the existing tunnel. The domain and route require a separate verification step. The Next.js app stores only validated public URLs in existing CMS fields. No new paid object-storage service and no Neon media blobs.

## Threat boundary / v1 controls

- Upload calls occur server-to-server through Ops, not from an unrestricted browser. Provision a separate 64-byte random MEDIA_UPLOAD_TOKEN in Doppler. Never use an existing agent read/write credential for media. No secrets in code, PRs, browser JS or logs.
- Accept POST /v1/media with a bounded JSON body and base64-encoded PNG, JPEG or WebP only. Enforce 2 MiB/image, 20 million pixels, dimensions at most 8192 each, 10 authenticated uploads/minute and a 512 MiB origin data cap. The service has one writer queue to prevent concurrent quota overruns.
- Prevent traversal with generated SHA-256 filenames, fixed MIME mapping, exact GET route, NOFOLLOW open flags, non-root volume and no write access from other containers. Objects are immutable; duplicate uploads return the same URL. There is no delete/list/overwrite API.
- Reject SVG uploads, HTML, arbitrary attachments, executable content and non-image MIME types. This is NOT a complete image-decoding or re-encoding gate; validation currently checks signatures, structural headers and bounds. Gate access to owner-only Ops and add raster decode/metadata stripping and corruption tests before any broader uploader role.
- GET/HEAD objects are PUBLIC; use only genuinely public, reviewed assets. Hashing does not make a resource secret. Objects cannot be revoked instantly after CDN caching. Do not upload customer images, secrets, internal screens, personal documents or private circuit designs.
- Return immutable caching plus ETag, Content-Type, X-Content-Type-Options: nosniff, a restrictive CSP and cross-origin image loading policy. No CORS upload permissions or directory listing. No developer-controlled remote-image hostnames in URLs.
- Allowlist in Next.js is exact-host and constrained to /files/<sha256>.<png|jpg|webp>. Never expand to wildcard remote patterns.
- Cloudflare may enforce additional upload body/rate/bot limits. Ensure configuration matches actual service limits. Default health check does not return token/configuration.

## Rollout plan

1. Merge the separate media-origin PR after npm verify, media server unit tests, pre-commit, build, and threat review. This does **not** turn on production uploads.
2. Verify the Docker network, disk usage and basic retention. Create a restricted persistent Docker volume and a service-scoped media token in the already-used Doppler project/config. Do not copy production data into a local test.
3. Stage the Docker Compose service on ops_internal, without a public DNS record, and check healthy. Run an authenticated upload with a synthetic harmless image through the internal Docker network; verify wrong-token/type and quota rejection. Restart container and verify persisted bytes.
4. Configure encrypted VPS backup for the new media volume and encrypted replication to MSI; run an isolated restore and hash comparison.
5. Add only a verified Cloudflare Tunnel hostname media.oaslananka.dev, routing to http://portfolio-media:8080. Verify GET/HEAD and public content caching. Verify that Ops management and other services were not exposed.
6. Register a separate Ops generic API connection with fixed HTTPS origin and POST-only path /v1/media, injecting the Doppler token. A new image upload returns the immutable public URL for a reviewed CMS proposal.
7. Deploy exact image origin allowlist and test Next Image processing, CSP, mobile rendering, and e2e media selection. New project drafts remain unpublished until separately approved.
8. Measure actual consumption, quotas and operational incidents before raising limits or adding other media formats.

## Recovery and constraints

Stop routing the Cloudflare hostname and stop the media service to suspend exposure. Leave the Docker volume intact for recovery; verify asset checksum and restore from backup before restarting. This feature does not alter Neon, Vercel production database identity, existing public image paths, the CMS approval system or PR #47 assets.

No automatic media garbage collection, overwrite, public posting, video upload or SVG processing in v1. Those changes need new scopes, threat review and tests. Data deletion needs a separate approval and CDN/cache eviction policy.
