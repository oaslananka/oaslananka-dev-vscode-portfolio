# GitHub route client bundle evidence

Issue #26 upgraded `react-github-calendar` from v4.5.6 to v5.0.6 and moved the contribution calendar behind an IntersectionObserver-triggered dynamic client boundary.

## Method

Both builds used Node.js 22.23.1, npm 10.9.8, Next.js 16.2.10 with Turbopack, the same source branch except for the calendar change, and explicit test-only bundled content. The build used `NODE_ENV=test`, `ALLOW_DEFAULT_CONTENT=true`, and the loopback site URL; no production database or credentials were used.

Raw, gzip, and Brotli byte counts come from the `/github` RSC client-reference manifest. The deferred calendar chunk is identified from the route's React loadable manifest and the contribution API marker. Reproduce the current measurement after a build with:

```bash
npm run bundle:github
```

## Results

| Metric | v4 direct import | v5 deferred boundary | Initial reduction |
| --- | ---: | ---: | ---: |
| Raw JavaScript | 264,778 B | 105,410 B | 159,368 B (60.2%) |
| Gzip JavaScript | 68,018 B | 36,071 B | 31,947 B (47.0%) |
| Brotli JavaScript | 56,187 B | 31,401 B | 24,786 B (44.1%) |

The v5 calendar is now a separate deferred chunk:

| Deferred calendar metric | Size |
| --- | ---: |
| Raw | 16,409 B |
| Gzip | 6,838 B |
| Brotli | 6,100 B |

## Decision

The migration is accepted. The initial `/github` client payload is materially smaller, the calendar loads only near the viewport, and its unavailable-data fallback remains explicit. Desktop and 320px mobile behavior are covered by Playwright, while the calendar boundary has a stable accessible region name and loading state.
