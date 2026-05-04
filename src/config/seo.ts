import { CONSTANTS, SUPPORTED_LANGUAGES } from './constants';

export const SEO_CONFIG = {
  appName: CONSTANTS.APP_NAME,
  appDomain: CONSTANTS.APP_DOMAIN,
  companyName: CONSTANTS.COMPANY_NAME,
  baseUrl: `https://${CONSTANTS.APP_DOMAIN}`,
  supportEmail: CONSTANTS.SUPPORT_EMAIL,
  defaultOgImage: `https://${CONSTANTS.APP_DOMAIN}/logo.png`,
  twitterHandle: CONSTANTS.TWITTER_HANDLE || undefined,
  supportedLanguages: [...SUPPORTED_LANGUAGES] as string[],
  defaultLanguage: 'en' as const,
} as const;

/**
 * Returns true when the current hostname indicates a non-production environment
 * (localhost, preview deployments, staging). SEOHead uses this to auto-set
 * `noindex` so dev/staging pages are never accidentally indexed.
 */
export function isNonProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('preview') ||
    hostname.includes('staging') ||
    hostname.includes('dev') ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.vercel.app')
  );
}
