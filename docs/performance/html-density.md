# Public HTML density

## Objective

Reduce real public-page markup without adding hidden prose, crawler-specific content, or duplicate copy. Agent Ready P13 measures visible text against complete HTML, so repeated inline SVG paths and serialized client-shell data reduce the ratio even when the authored content is substantial.

## Changes

- Replaced public `react-icons` output with compact `<svg><use>` references to one same-origin sprite.
- Generated 42 typed symbols in `public/icons/ui.svg`.
- Versioned the sprite URL as `/icons/ui.svg?v=1` and applied `Cache-Control: public, max-age=31536000, immutable`.
- Removed the full profile and site-settings records from the persistent client layout boundary.
- Passed only the fields required by the title bar, status bar, and optional terminal.
- Added `npm run report:html-density -- <url> [--json]` for repeatable diagnostics.

## Measurement method

The reporter downloads or receives the initial HTML, counts UTF-8 bytes, computes gzip and Brotli sizes, removes comments plus `script`, `style`, `template`, `noscript`, and `svg` blocks for a conservative visible-text estimate, and reports the resulting ratio. It is intentionally independent of Agent Ready and does not claim byte-for-byte parity with that service.

The baseline was captured from the production deployment at commit `2bf3f581ee0aef9bf6d120138cc1cad17b0cd60f`. The optimized result was captured from a successful Next.js 16 production build of this branch. The build used the repository's bundled canonical content in explicit test mode; production content dates and ordering can differ slightly, while the markup architecture being compared is the same.

## Results

| Route | Raw HTML before | Raw HTML after | Reduction | Ratio before | Ratio after |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 121,030 B | 64,846 B | 46.4% | 2.27% | 4.27% |
| `/projects` | 153,516 B | 89,194 B | 41.9% | 2.35% | 4.05% |
| `/articles` | 148,913 B | 78,783 B | 47.1% | 1.90% | 3.59% |
| `/projects/kicad-mcp-pro` | 131,952 B | 83,093 B | 37.0% | 3.38% | 5.36% |
| `/articles/production-first-edge-ai` | 119,583 B | 77,375 B | 35.3% | 4.59% | 7.07% |

### Transfer and markup details

| Route | Gzip reduction | Brotli reduction | Script-byte reduction | Inline SVG-byte reduction |
| --- | ---: | ---: | ---: | ---: |
| `/` | 62.6% | 51.3% | 41.5% | 86.2% |
| `/projects` | 52.1% | 45.1% | 36.9% | 83.9% |
| `/articles` | 49.3% | 44.2% | 41.9% | 84.6% |
| `/projects/kicad-mcp-pro` | 48.2% | 44.8% | 32.6% | 85.5% |
| `/articles/production-first-edge-ai` | 40.8% | 39.3% | 28.9% | 84.6% |

The homepage's conservative text-to-HTML ratio improved by 2.00 percentage points, an 88.1% relative increase. The representative article improved by 2.48 percentage points to 7.07% without changing its visible prose.

The generated sprite is 44,779 bytes before compression, is requested once, and is reusable across every public route. Page HTML contains only small symbol references. A future sprite-content change must increment `UI_ICON_SPRITE_VERSION` in `lib/static-assets.ts` before deployment.

## Interpretation

The remaining denominator is dominated by Next.js App Router's React Server Component bootstrap and hydration data. Removing it would require a disproportionate routing architecture rewrite or different content for crawlers, neither of which is justified. The site already exposes direct Markdown mirrors, `Accept: text/markdown` negotiation, `llms.txt`, and `llms-full.txt`, so agents have clean content-first representations even when they choose not to parse the visual HTML shell.

The final production deployment should be re-measured with this reporter and with Agent Ready. A score below P13's generic 10% threshold is acceptable when the real HTML weight has fallen materially, visible design and accessibility remain intact, and clean Markdown alternatives continue to pass.
