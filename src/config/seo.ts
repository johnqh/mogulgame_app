import { type SEOHeadConfig } from '@sudobility/seo_lib';
import { CONSTANTS, SUPPORTED_LANGUAGES } from './constants';

export const seoHeadConfig: SEOHeadConfig = {
  appName: CONSTANTS.APP_NAME,
  baseUrl: `https://${CONSTANTS.APP_DOMAIN}`,
  defaultOgImage: `https://${CONSTANTS.APP_DOMAIN}/logo.png`,
  twitterHandle: CONSTANTS.TWITTER_HANDLE || undefined,
  supportedLanguages: SUPPORTED_LANGUAGES as unknown as string[],
  defaultLanguage: 'en',
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'Project Template',
};
