import * as Sentry from '@sentry/nextjs';

import { SENTRY_DATA_COLLECTION } from './lib/sentry-data-collection';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
  dataCollection: SENTRY_DATA_COLLECTION,
  // Conservative production default; tune after observing real traffic.
  debug: false,
});
