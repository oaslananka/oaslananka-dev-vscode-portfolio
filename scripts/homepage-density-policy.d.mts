export interface HomepageDensityPolicy {
  minRatioPercent: number;
  minVisibleTextCharacters: number;
  maxBrotliHtmlBytes: number;
}

export interface HomepageDensityResult {
  ratioPercent: number;
  visibleTextCharacters: number;
  brotliHtmlBytes: number;
}

export const LOCAL_HOMEPAGE_TARGET: '.next/server/app/index.html';

export const HOMEPAGE_DENSITY_POLICY: Readonly<HomepageDensityPolicy>;

export function validateLocalHomepageTarget(target: string): void;

export function assertHomepageDensity(
  result: HomepageDensityResult,
  policy?: Readonly<HomepageDensityPolicy>,
): void;
