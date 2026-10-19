# Isolated Vercel Preview

Vercel Preview intentionally has no production DATABASE_URL. Prior builds
failed at getPublishedPosts() while pre-rendering pages. Preview now uses the
repository's bundled example content only when VERCEL_ENV=preview and
neither database URL is configured. That allows checking layout and browser
behavior without a new service, duplicate database, or paid environment.

The page displays a prominent PREVIEW — Demonstration content only
banner and robots.txt disallows crawling. Preview does not prove that live
CMS records or messages work; production continues to require database
readiness and fails closed when its database is unavailable.

If a dedicated preview DB is added in the future, sample fallback is disabled
and the preview must be migrated/separately configured. Never copy production
secrets into Preview solely to make a build succeed.
