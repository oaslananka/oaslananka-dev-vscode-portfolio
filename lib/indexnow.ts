import * as Sentry from '@sentry/nextjs';

import {
  isEnvironmentFlagEnabled,
  isProductionDeployment,
  type DeploymentEnvironmentVariables,
} from './deployment-environment';
import { SITE_URL } from './site-config';

export const INDEXNOW_KEY =
  '9fe0ed0bfa728eed99d225b42ae7f0a968031dc939ad1452';
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_TIMEOUT_MS = 5_000;
const INDEXNOW_URL_LIMIT = 10_000;
const INDEXNOW_RETRY_DELAYS_MS = [250, 1_000, 3_000] as const;

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export interface IndexNowResult {
  submitted: boolean;
  status?: number;
  urlCount: number;
  attempts?: number;
  reason: 'accepted' | 'disabled' | 'empty' | 'failed';
}

export interface IndexNowEnvironment extends DeploymentEnvironmentVariables {
  INDEXNOW_DISABLED?: string;
}

export interface IndexNowOptions {
  environment?: IndexNowEnvironment;
  fetcher?: typeof fetch;
  retryDelaysMs?: readonly number[];
  timeoutMs?: number;
}

export function buildIndexNowPayload(
  paths: Iterable<string>,
  siteUrl = SITE_URL,
): IndexNowPayload | null {
  const site = new URL(siteUrl);
  const urls = new Set<string>();

  for (const path of paths) {
    const url = new URL(path, site);
    if (url.origin !== site.origin) {
      throw new Error(`IndexNow URL must belong to ${site.origin}.`);
    }

    url.hash = '';
    urls.add(url.toString());
  }

  if (urls.size === 0) return null;
  if (urls.size > INDEXNOW_URL_LIMIT) {
    throw new Error(`IndexNow accepts at most ${INDEXNOW_URL_LIMIT} URLs.`);
  }

  return {
    host: site.host,
    key: INDEXNOW_KEY,
    keyLocation: new URL(INDEXNOW_KEY_PATH, site).toString(),
    urlList: [...urls],
  };
}

function canSubmit(
  siteUrl: string,
  environment: IndexNowEnvironment = process.env,
): boolean {
  const site = new URL(siteUrl);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(site.hostname);

  return (
    isProductionDeployment(environment) &&
    !isEnvironmentFlagEnabled(environment.INDEXNOW_DISABLED) &&
    site.protocol === 'https:' &&
    !isLocal
  );
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function reportFailure(
  error: unknown,
  status: number | undefined,
  urlCount: number,
  attempts: number,
): void {
  const exception =
    error instanceof Error
      ? error
      : new Error(`IndexNow failed${status ? ` with HTTP ${status}` : ''}.`);

  Sentry.captureException(exception, {
    tags: { component: 'indexnow' },
    extra: { status, urlCount, attempts },
  });
  console.error('IndexNow notification failed.', {
    error: exception.message,
    status,
    urlCount,
    attempts,
  });
}

export async function notifyIndexNow(
  paths: Iterable<string>,
  siteUrl = SITE_URL,
  options: IndexNowOptions = {},
): Promise<IndexNowResult> {
  let payload: IndexNowPayload | null;

  try {
    payload = buildIndexNowPayload(paths, siteUrl);
  } catch (error) {
    console.error('IndexNow payload creation failed.', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { submitted: false, urlCount: 0, reason: 'failed' };
  }

  if (!payload) {
    return { submitted: false, urlCount: 0, reason: 'empty' };
  }

  if (!canSubmit(siteUrl, options.environment)) {
    return {
      submitted: false,
      urlCount: payload.urlList.length,
      reason: 'disabled',
    };
  }

  const fetcher = options.fetcher ?? fetch;
  const retryDelays = options.retryDelaysMs ?? INDEXNOW_RETRY_DELAYS_MS;
  const timeoutMs = options.timeoutMs ?? INDEXNOW_TIMEOUT_MS;
  const maxAttempts = retryDelays.length + 1;
  let lastError: unknown;
  let lastStatus: number | undefined;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });

      lastStatus = response.status;
      if (response.status === 200 || response.status === 202) {
        return {
          submitted: true,
          status: response.status,
          urlCount: payload.urlList.length,
          attempts,
          reason: 'accepted',
        };
      }

      lastError = new Error(
        `IndexNow rejected the notification with HTTP ${response.status}.`,
      );
      if (!shouldRetry(response.status)) break;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }

    if (attempts < maxAttempts) {
      await wait(retryDelays[attempts - 1] ?? 0);
    }
  }

  reportFailure(lastError, lastStatus, payload.urlList.length, attempts);
  return {
    submitted: false,
    status: lastStatus,
    urlCount: payload.urlList.length,
    attempts,
    reason: 'failed',
  };
}
