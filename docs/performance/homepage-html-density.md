# Homepage HTML density

## Purpose

The homepage must provide enough immediately readable engineering context for people, search systems, and AI agents without hidden text, crawler-specific responses, or a second rendering path. The repository enforces this with:

```bash
npm run build
npm run test:homepage-density
```

The assertion reads `.next/server/app/index.html` by default. A URL can also be supplied directly:

```bash
npm run test:homepage-density -- https://www.oaslananka.dev/
```

## Policy

The generated homepage must satisfy both conditions:

- text-to-HTML ratio of at least **11%**;
- Brotli-compressed HTML no larger than **12,500 bytes**.

The public Agent Ready check currently requires 10%. The extra local margin accounts for small differences between the repository measurement and an external scanner, while the compressed-size limit prevents passing the ratio by publishing an unbounded document.

## Evidence

Before this change, the live homepage measured:

| Metric | Baseline |
|---|---:|
| Raw HTML | 65,893 bytes |
| Brotli HTML | 9,193 bytes |
| Visible text | 2,742 characters |
| Text-to-HTML | 4.16% |
| Agent Ready P13 | 3.8% |

The verified production build after the content change measured:

| Metric | Result |
|---|---:|
| Raw HTML | 85,001 bytes |
| Brotli HTML | 11,725 bytes |
| Visible text | 9,632 characters |
| Text-to-HTML | 11.33% |

The additional network cost is about 2.5 KB with Brotli. The added text is visible homepage content: three production-engineering principles and a four-stage prototype-to-release workflow. The same source content is published in `/index.md`.

## Architecture finding

A proposed split of the top-level client shell was measured before adoption. In Next.js App Router, the initial response still contained the React Server Component payload, while the new interaction islands added client-reference metadata. The isolated experiment changed raw HTML from 65,893 to 70,252 bytes and script payload from 37,562 to 42,229 bytes, reducing density from 4.16% to 3.94%. The experiment was rejected and is not part of the production implementation.

This result is why raw script size is not used as the acceptance metric for this page. The framework duplicates server-rendered content in the Flight payload, so useful visible content can increase raw script bytes even while remaining inexpensive after compression. Density plus compressed size gives a more honest guardrail.

## Maintenance

When homepage copy or framework output changes:

1. run a production build;
2. run the density assertion;
3. inspect both ratio and Brotli size;
4. keep HTML and `/index.md` content aligned;
5. rerun Agent Ready after deployment.

Do not satisfy the threshold with visually hidden copy, closed content added only for scanners, user-agent branching, or unsupported claims.
