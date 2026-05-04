/** Application-wide constants sourced from environment variables with sensible defaults. */
export const CONSTANTS = {
  // Branding
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Starter',
  APP_DOMAIN: import.meta.env.VITE_APP_DOMAIN || 'localhost',
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || 'Sudobility',
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'support@example.com',

  // API
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8022',

  // Feature flags
  DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
  SHOW_PERFORMANCE_MONITOR: import.meta.env.VITE_SHOW_PERFORMANCE_MONITOR === 'true',

  // RevenueCat
  REVENUECAT_API_KEY: '',
  REVENUECAT_API_KEY_SANDBOX: '',

  // Social handles (without @ or full URL)
  TWITTER_HANDLE: import.meta.env.VITE_TWITTER_HANDLE || '',
  DISCORD_INVITE: import.meta.env.VITE_DISCORD_INVITE || '',
  LINKEDIN_COMPANY: import.meta.env.VITE_LINKEDIN_COMPANY || '',
  GITHUB_ORG: import.meta.env.VITE_GITHUB_ORG || '',

  // Social links (full URLs) - property names must match SocialLinksConfig from building_blocks
  SOCIAL_LINKS: {
    twitterUrl: import.meta.env.VITE_TWITTER_URL || '',
    redditUrl: import.meta.env.VITE_REDDIT_URL || '',
    discordUrl: import.meta.env.VITE_DISCORD_URL || '',
    linkedinUrl: import.meta.env.VITE_LINKEDIN_URL || '',
    farcasterUrl: import.meta.env.VITE_FARCASTER_URL || '',
    telegramUrl: import.meta.env.VITE_TELEGRAM_URL || '',
    githubUrl: import.meta.env.VITE_GITHUB_URL || '',
  },

  // External pages
  STATUS_PAGE_URL: import.meta.env.VITE_STATUS_PAGE_URL || '',
  STATUS_PAGE_API_URL: import.meta.env.VITE_STATUS_PAGE_URL
    ? `${import.meta.env.VITE_STATUS_PAGE_URL}/api/v2/status.json`
    : '',

  // Founder meeting link (e.g., Cal.com, Calendly)
  MEET_FOUNDER_URL: import.meta.env.VITE_MEET_FOUNDER_URL || '',

  // Navigation items
  NAV_ITEMS: [
    { label: 'home', href: '/' },
    { label: 'docs', href: '/docs' },
    { label: 'histories', href: '/histories', protected: true },
  ],
} as const;

/** All language codes the application supports for i18n routing. */
export const SUPPORTED_LANGUAGES = [
  'en',
  'ar',
  'de',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pt',
  'ru',
  'sv',
  'th',
  'uk',
  'vi',
  'zh',
  'zh-hant',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Type guard that checks whether a string is one of the supported language codes.
 *
 * @param lang - The language code to validate.
 * @returns `true` if the code is a member of {@link SUPPORTED_LANGUAGES}.
 */
export const isLanguageSupported = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};
