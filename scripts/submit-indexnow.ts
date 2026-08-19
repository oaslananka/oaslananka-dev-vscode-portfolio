import { notifyIndexNow } from '../lib/indexnow';
import { decodeXmlText } from '../lib/discovery';
import { SITE_URL } from '../lib/site-config';

async function main(): Promise<void> {
  const sitemapUrl = new URL('/sitemap.xml', SITE_URL);
  const response = await fetch(sitemapUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      `Could not fetch ${sitemapUrl}: HTTP ${response.status}.`,
    );
  }

  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) =>
    decodeXmlText(match[1].trim()),
  );

  if (urls.length === 0) {
    throw new Error('The sitemap contains no URLs.');
  }

  const result = await notifyIndexNow(urls);
  if (!result.submitted) {
    throw new Error(
      `IndexNow submission failed: ${result.reason}${
        result.status ? ` (HTTP ${result.status})` : ''
      }.`,
    );
  }

  console.log(`indexnow_submitted=${result.urlCount}`);
  console.log(`indexnow_status=${result.status}`);
  console.log(`indexnow_attempts=${result.attempts ?? 0}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'IndexNow failed.');
  process.exitCode = 1;
});
