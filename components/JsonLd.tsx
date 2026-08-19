/**
 * Renders a JSON-LD structured-data block. Server component: the JSON is in the
 * initial HTML so search engines and AI crawlers read it without executing JS.
 */
import { serializeJsonLd } from '@/lib/seo';

export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
