const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const sentryClient = dsn
  ? import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn,
        enabled: true,
        tracesSampleRate: 0,
        sendDefaultPii: false,
        debug: false,
      });

      return Sentry;
    })
  : null;

export function onRouterTransitionStart(
  href: string,
  navigationType: string,
): void {
  void sentryClient?.then((Sentry) => {
    Sentry.captureRouterTransitionStart(href, navigationType);
  });
}
