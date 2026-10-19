# Portfolio media origin -- issue #48

This directory provides an isolated Node 24 image server for the already-owned VPS. Merging this PR will not deploy a container, expose ports, create DNS records, or modify the production CMS.

## API contract

- GET /healthz: minimal liveness response.
- POST /v1/media: a distinct Bearer MEDIA_UPLOAD_TOKEN (at least 32 bytes), JSON { "mimeType": "image/png", "contentBase64": "..." }. PNG, JPEG and WebP only. The per-file cap is 2 MiB, maximum 10 authenticated attempts/minute.
- GET/HEAD /files/<sha256>.<png|jpg|webp>: public immutable media with ETag, no listing, fixed MIME, nosniff and CSP sandbox.
- The content-addressed filesystem has a default 512 MiB quota and identical uploads deduplicate. There is no overwrite or deletion endpoint.

This is a deliberately **owner-only MVP**: signature and dimension checks do not perform full decode/re-encode. Add full image validation, metadata stripping, persistent rate limiting, exhaustive codec tests and edge quotas before allowing untrusted third-party uploaders. Never expose SVG/HTML/script uploads without a reviewed rasterization path.

## Local tests

Run from the root of the repository:

    node --test services/portfolio-media/server.test.mjs

Tests only use disposable directories and have no external database dependencies.

## Staged deployment and rollback

1. Verify the ops_internal Docker network, VPS space and encrypted backup/restore procedures.
2. Create a NEW independent 64-byte MEDIA_UPLOAD_TOKEN in Doppler for this service, separate from AGENT_API_WRITE_KEY. Never commit credentials or print them.
3. Deploy via Docker Compose inside ops_internal using the selected Doppler configuration. No host ports are published.
4. Verify health, authenticated/unauthenticated upload, cache and restart persistence while the service is private. Arrange encrypted VPS-to-MSI media-volume backup with a successful isolated restore test.
5. Configure a dedicated Cloudflare public hostname media.oaslananka.dev targeting http://portfolio-media:8080 in the same existing tunnel. Do not expose Ops admin or management paths.
6. Register a separate, POST-only Ops generic API connection with the Doppler MEDIA_UPLOAD_TOKEN reference.
7. Confirm public GET and Content-Type, cache behavior, quotas, rate limits and prohibited-file rejection. Then deploy exact media hostname allowlisting in the Next.js site.
8. Link uploaded media URLs to projects or articles only through existing admin/CMS owner approval; publishing remains separate.

Rollback: remove the Cloudflare hostname route and stop the media service, leaving the persistent Docker volume intact for recovery. Existing code-managed images remain available. The data retention and deletion workflow requires its own explicitly reviewed design.

No paid storage product, no new production database branch, no automatic publishing and no replacement of already-public content.
