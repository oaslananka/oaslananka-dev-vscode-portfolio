'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { VscCheck, VscClose, VscShield } from '@/components/UiIcons';

import MetaPixel from '@/components/MetaPixel';
import styles from '@/styles/ConsentManager.module.css';

type ConsentChoice = 'analytics' | 'essential';

interface ConsentManagerProps {
  gaId?: string;
  gtmId?: string;
  metaPixelId?: string;
}

interface StoredConsent {
  choice: ConsentChoice;
  updatedAt: string;
  version: 1;
}

type TrackingWindow = Window & {
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

const CONSENT_STORAGE_KEY = 'oaslananka:privacy-consent';
const CONSENT_COOKIE_NAME = 'oa_privacy_choice';
const PRIVACY_CONTROL_SLOT_ID = 'privacy-control-slot';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const getServerPrivacySlotSnapshot = () => null;

function getPrivacySlotSnapshot(): HTMLElement | null {
  return document.getElementById(PRIVACY_CONTROL_SLOT_ID);
}

function subscribeToPrivacySlot(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === 'analytics' || value === 'essential';
}

function readCookieChoice(): ConsentChoice | null {
  const encodedChoice = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${CONSENT_COOKIE_NAME}=`))
    ?.split('=')[1];

  if (!encodedChoice) return null;

  const choice = decodeURIComponent(encodedChoice);
  return isConsentChoice(choice) ? choice : null;
}

function readStoredConsent(): ConsentChoice | null {
  try {
    const rawValue = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!rawValue) return readCookieChoice();

    const parsed = JSON.parse(rawValue) as Partial<StoredConsent>;
    return parsed.version === 1 && isConsentChoice(parsed.choice)
      ? parsed.choice
      : null;
  } catch {
    return readCookieChoice();
  }
}

function storeConsent(choice: ConsentChoice): void {
  const value: StoredConsent = {
    choice,
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
    document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(choice)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
  }
}

function updateGoogleConsent(
  choice: ConsentChoice,
  gaId?: string,
): void {
  const trackingWindow = window as TrackingWindow & Record<string, unknown>;
  const dataLayer = (trackingWindow.dataLayer ??= []);

  trackingWindow.gtag ??= (...args: unknown[]) => {
    dataLayer.push(args);
  };

  const granted = choice === 'analytics';
  trackingWindow.gtag('consent', 'update', {
    ad_personalization: granted ? 'granted' : 'denied',
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
  });

  if (gaId) trackingWindow[`ga-disable-${gaId}`] = !granted;
}

function updateMetaConsent(choice: ConsentChoice): void {
  const trackingWindow = window as TrackingWindow;
  if (!trackingWindow.fbq) return;
  trackingWindow.fbq('consent', choice === 'analytics' ? 'grant' : 'revoke');
}

function deleteKnownAnalyticsCookies(): void {
  const analyticsCookiePattern = /^(_ga|_gid|_gat|_gcl_|_fbp|_fbc)/;
  const hostname = window.location.hostname;
  const domains = ['', hostname, `.${hostname}`];

  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !analyticsCookiePattern.test(name)) return;

    domains.forEach((domain) => {
      const domainAttribute = domain ? `; Domain=${domain}` : '';
      document.cookie = `${name}=; Max-Age=0; Path=/${domainAttribute}; SameSite=Lax`;
    });
  });
}

function AnalyticsScripts({
  gtmId,
  gaId,
  metaPixelId,
}: ConsentManagerProps) {
  return (
    <>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      {metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

function PrivacyPanel({
  choice,
  panelRef,
  onClose,
  onChoose,
}: {
  choice: ConsentChoice | null;
  panelRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onChoose: (choice: ConsentChoice) => void;
}) {
  return (
    <section
      aria-labelledby="privacy-consent-title"
      className={styles.panel}
      ref={panelRef}
      tabIndex={-1}
    >
      <div className={styles.headingRow}>
        <VscShield aria-hidden="true" className={styles.shield} size={20} />
        <div>
          <h2 className={styles.title} id="privacy-consent-title">
            Privacy choices
          </h2>
          {choice ? (
            <p className={styles.currentChoice}>
              <VscCheck aria-hidden="true" size={13} />
              {choice === 'analytics'
                ? 'Optional analytics allowed'
                : 'Essential services only'}
            </p>
          ) : null}
        </div>
        {choice ? (
          <button
            aria-label="Close privacy choices"
            className={styles.closeButton}
            onClick={onClose}
            title="Close privacy choices"
            type="button"
          >
            <VscClose aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>

      <p className={styles.copy}>
        Optional analytics help measure which work is useful. They stay off
        until you allow them; essential security and contact features
        continue either way. <Link href="/privacy">Read the privacy notice</Link>.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.secondaryButton}
          onClick={() => onChoose('essential')}
          type="button"
        >
          Essential only
        </button>
        <button
          className={styles.primaryButton}
          onClick={() => onChoose('analytics')}
          type="button"
        >
          Allow analytics
        </button>
      </div>
    </section>
  );
}

export default function ConsentManager({
  gaId,
  gtmId,
  metaPixelId,
}: ConsentManagerProps) {
  const pathname = usePathname();
  const [choice, setChoice] = useState<ConsentChoice | null>(() =>
    typeof window === 'undefined' ? null : readStoredConsent(),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const isAdminRoute = pathname.startsWith('/admin');
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const privacyControlSlot = useSyncExternalStore(
    subscribeToPrivacySlot,
    getPrivacySlotSnapshot,
    getServerPrivacySlotSnapshot,
  );

  useEffect(() => {
    updateGoogleConsent('essential', gaId);
    updateMetaConsent('essential');

    if (choice && !isAdminRoute) {
      updateGoogleConsent(choice, gaId);
      updateMetaConsent(choice);
    }
  }, [choice, gaId, isAdminRoute]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CONSENT_STORAGE_KEY) return;
      window.location.reload();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (settingsOpen) panelRef.current?.focus();
  }, [settingsOpen]);

  const choose = (nextChoice: ConsentChoice) => {
    const isRevoking = choice === 'analytics' && nextChoice === 'essential';

    storeConsent(nextChoice);
    updateGoogleConsent(nextChoice, gaId);
    updateMetaConsent(nextChoice);

    if (nextChoice === 'essential') deleteKnownAnalyticsCookies();

    setChoice(nextChoice);
    setSettingsOpen(false);

    // A reload removes provider scripts that were already downloaded before a
    // visitor withdrew consent; the next render will not mount them again.
    if (isRevoking) {
      window.location.reload();
      return;
    }

    window.requestAnimationFrame(() => settingsButtonRef.current?.focus());
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    window.requestAnimationFrame(() => settingsButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!settingsOpen || !choice) return;

    const handleSettingsKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setSettingsOpen(false);
      window.requestAnimationFrame(() => settingsButtonRef.current?.focus());
    };

    window.addEventListener('keydown', handleSettingsKeyDown);
    return () => window.removeEventListener('keydown', handleSettingsKeyDown);
  }, [choice, settingsOpen]);

  if (!hydrated || isAdminRoute) return null;

  const panelOpen = choice === null || settingsOpen;
  const analyticsAllowed = choice === 'analytics';

  return (
    <>
      {analyticsAllowed ? (
        <AnalyticsScripts gaId={gaId} gtmId={gtmId} metaPixelId={metaPixelId} />
      ) : null}

      {panelOpen ? (
        <PrivacyPanel
          choice={choice}
          onChoose={choose}
          onClose={closeSettings}
          panelRef={panelRef}
        />
      ) : privacyControlSlot ? (
        createPortal(
          <button
            aria-label="Open privacy choices"
            className={styles.settingsButton}
            onClick={() => setSettingsOpen(true)}
            ref={settingsButtonRef}
            title="Privacy choices"
            type="button"
          >
            <VscShield aria-hidden="true" size={17} />
          </button>,
          privacyControlSlot,
        )
      ) : null}
    </>
  );
}
