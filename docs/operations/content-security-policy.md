# Content Security Policy

The active policy remains compatible with static generation and ISR. Next.js emits
framework-owned inline bootstrap scripts for statically generated App Router pages,
so removing `script-src 'unsafe-inline'` would require per-request nonces and force
all pages into dynamic rendering.

The application-owned theme bootstrap is therefore served from the versioned
`/theme-init.v1.js` asset and cached immutably. The document exposes only an
allowlisted `data-default-theme` value. `script-src-attr 'none'` blocks inline event
handler attributes even while the temporary framework compatibility allowance
remains.

Before removing `unsafe-inline`, compare these options in a preview deployment:

1. Per-request nonces, accepting the loss of ISR/CDN page caching.
2. Next.js SRI after it is stable with the production bundler.
3. A framework release that removes or hashes static inline bootstrap payloads.

Do not weaken the policy to solve a third-party integration issue. Add the narrowest
origin and verify the consent-disabled path before deployment.
