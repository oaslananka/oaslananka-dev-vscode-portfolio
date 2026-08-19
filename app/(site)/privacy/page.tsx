import type { Metadata } from 'next';
import Link from 'next/link';

import JsonLd from '@/components/JsonLd';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import styles from '@/styles/ArticlePage.module.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy',
  description:
    'How oaslananka.dev handles contact details, security data, analytics and privacy choices.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Privacy', path: '/privacy' },
        ])}
      />
      <article className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Privacy</h1>
          <p>
            Last updated: <time dateTime="2026-07-14">July 14, 2026</time>
          </p>
        </header>

        <div className={styles.prose}>
          <p>
            This notice explains how oaslananka.dev handles information when
            you browse the portfolio or send an inquiry.
          </p>

          <h2>Information collected</h2>
          <p>
            The contact form collects your name, email address, inquiry type,
            optional organization, and message. Security controls may process a
            short-lived, pseudonymous identifier derived from request data to
            prevent abuse. The site also receives standard technical request
            data from its hosting and error-monitoring providers.
          </p>

          <h2>How information is used</h2>
          <p>
            Contact details are used only to review and respond to project,
            employment, or collaboration inquiries. Technical data is used to
            operate, secure, and diagnose the site. Optional analytics and
            marketing integrations are not loaded before you select &quot;Allow
            analytics.&quot;
          </p>

          <h2>Service providers</h2>
          <p>
            The site may use Vercel for hosting, Neon for database hosting,
            Resend for email delivery, and Sentry for essential error
            monitoring. Sentry Session Replay is disabled. These providers may
            receive standard request, device, and diagnostic data needed to
            operate their services.
          </p>
          <p>
            After consent, the site may also load Vercel Analytics and Speed
            Insights, Google Analytics or Google Tag Manager, and Meta Pixel.
            Those services may process page, device, referral, and interaction
            data and may set their own identifiers according to their terms.
          </p>

          <h2>Retention</h2>
          <p>
            Contact inquiries receive an expiry date no later than 12 months
            after receipt, and abuse-prevention records expire after 24 hours.
            A scheduled cleanup removes expired records, with additional
            cleanup performed during relevant site activity. Physical deletion
            follows the next successful cleanup run. Records may be kept longer
            only where required to establish or protect legal rights.
          </p>

          <h2>Your choices and rights</h2>
          <p>
            You may ask to access, correct, or delete your contact information,
            or object to its processing. Your analytics choice is stored on
            your device. Use the shield button in the title bar to change or
            withdraw it at any time. Withdrawing consent disables
            further optional measurement, removes known first-party analytics
            cookies, and reloads the page without optional provider scripts.
            You can also clear site data in your browser. The site does not sell
            personal data and does not use it for automated decision-making.
          </p>

          <h2>Contact</h2>
          <p>
            Send privacy requests through the <Link href="/contact">contact page</Link>.
            Requests will be handled after reasonable identity verification.
          </p>
        </div>
      </article>
    </div>
  );
}
