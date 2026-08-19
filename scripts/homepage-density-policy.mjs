export const LOCAL_HOMEPAGE_TARGET = '.next/server/app/index.html';

export const HOMEPAGE_DENSITY_POLICY = Object.freeze({
  minRatioPercent: 9.75,
  minVisibleTextCharacters: 8_000,
  maxBrotliHtmlBytes: 12_500,
});

export function validateLocalHomepageTarget(target) {
  if (target !== LOCAL_HOMEPAGE_TARGET) {
    throw new Error(
      `Local density checks may only read ${LOCAL_HOMEPAGE_TARGET}; use an HTTP(S) URL for remote pages.`,
    );
  }
}

export function assertHomepageDensity(
  result,
  policy = HOMEPAGE_DENSITY_POLICY,
) {
  const failures = [];

  if (result.ratioPercent < policy.minRatioPercent) {
    failures.push(
      `text-to-HTML ratio ${result.ratioPercent}% is below ${policy.minRatioPercent}%`,
    );
  }

  if (result.visibleTextCharacters < policy.minVisibleTextCharacters) {
    failures.push(
      `visible text ${result.visibleTextCharacters} characters is below ${policy.minVisibleTextCharacters}`,
    );
  }

  if (result.brotliHtmlBytes > policy.maxBrotliHtmlBytes) {
    failures.push(
      `Brotli HTML size ${result.brotliHtmlBytes} bytes exceeds ${policy.maxBrotliHtmlBytes} bytes`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`Homepage density policy failed: ${failures.join('; ')}.`);
  }
}
