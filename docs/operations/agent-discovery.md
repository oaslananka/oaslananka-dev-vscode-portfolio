# Agent discovery and Markdown interoperability

The public site exposes the same portfolio content through normal HTML and explicit machine-readable surfaces. Bots never receive privileged or different HTML content.

## Endpoints

- `/.md` and `/index.md` — canonical Markdown mirrors of the homepage with YAML frontmatter and a sitemap section.
- `<canonical-path>.md` — route-specific Markdown mirrors for every static page, project, and published article in the XML sitemap.
- `/sitemap.md` — descriptive human-readable sitemap grouped by main pages, projects, articles, and machine resources.
- `/llms.txt` — compact portfolio context.
- `/llms-full.txt` — expanded profile, experience, project, and article context.
- `/AGENTS.md` — installation, configuration, usage, verification, and safety guidance for coding agents.
- `/sitemap.xml` and `/feed.xml` — standard crawler and feed discovery.
- `/glossary` — public definitions for recurring engineering terminology.

## Content negotiation

A request to any canonical public page with an explicit positive `Accept: text/markdown` media type is internally rewritten to the matching Markdown document. Normal browser and crawler requests continue to receive the same HTML page. HTML metadata advertises a route-specific Markdown alternate; Markdown responses send `Vary: Accept`, `Content-Location`, a canonical HTML `Link`, and `X-Robots-Tag: noindex, follow` to avoid duplicate search indexing.

## Security and privacy boundaries

Machine-readable output is generated only from already-public profile, project, article, and site-setting fields. It excludes contact messages, admin state, credentials, rate-limit records, and unpublished posts. Database-backed content remains fail-closed in production.

## Verification

```bash
curl --fail --header 'Accept: text/markdown' https://www.oaslananka.dev/
curl --fail https://www.oaslananka.dev/.md
curl --fail https://www.oaslananka.dev/about.md
curl --fail https://www.oaslananka.dev/projects/kicad-mcp-pro.md
curl --fail https://www.oaslananka.dev/sitemap.md
curl --fail https://www.oaslananka.dev/llms-full.txt
curl --fail https://www.oaslananka.dev/AGENTS.md
```

The HTML text-to-markup ratio can remain low in a React Server Components document because framework hydration data is included in the response. The site does not add hidden or repetitive text merely to satisfy that heuristic; clean Markdown negotiation is the extraction path for agents.
