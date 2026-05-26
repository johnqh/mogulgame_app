/**
 * SEO configuration for MogulGame.
 *
 * Used by generate-seo-assets.mjs from @johnqh/workflows to produce
 * per-route localized index.html files, sitemap.xml, and robots.txt.
 */

const APP_NAME = process.env.VITE_APP_NAME || 'MogulGame';

export default {
  supportedLanguages: [
    'en', 'ar', 'de', 'es', 'fr', 'it', 'ja', 'ko',
    'pt', 'ru', 'sv', 'th', 'uk', 'vi', 'zh', 'zh-hant',
  ],

  languageHreflangMap: {
    en: 'en',
    ar: 'ar',
    de: 'de',
    es: 'es',
    fr: 'fr',
    it: 'it',
    ja: 'ja',
    ko: 'ko',
    pt: 'pt',
    ru: 'ru',
    sv: 'sv',
    th: 'th',
    uk: 'uk',
    vi: 'vi',
    zh: 'zh-Hans',
    'zh-hant': 'zh-Hant',
  },

  primaryDomain: 'mogulgame.app',
  appName: APP_NAME,
  appDomain: process.env.VITE_APP_DOMAIN || 'mogulgame.app',
  robotsDisallowPaths: ['/*/dashboard/', '/*/login'],

  routes: [
    {
      key: 'home',
      path: '',
      namespace: 'common',
      priority: '1.0',
      changefreq: 'weekly',
      indexable: true,
      meta: locale => ({
        title: locale.common.seo.home.title,
        description: locale.common.seo.home.description,
        keywords: locale.common.seo.home.keywords,
      }),
    },
    {
      key: 'how-to-play',
      path: '/how-to-play',
      namespace: 'common',
      priority: '0.8',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.common.howToPlay.seoTitle,
        description: locale.common.howToPlay.seoDescription,
        keywords: [],
      }),
    },
    {
      key: 'why-play',
      path: '/why-play',
      namespace: 'common',
      priority: '0.8',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.common.whyPlay.seoTitle,
        description: locale.common.whyPlay.seoDescription,
        keywords: [],
      }),
    },
    {
      key: 'settings',
      path: '/settings',
      namespace: 'common',
      priority: '0.1',
      changefreq: 'monthly',
      indexable: false,
      meta: () => ({
        title: `Settings - ${APP_NAME}`,
        description: `Customize your ${APP_NAME} experience.`,
        keywords: [],
      }),
    },
    {
      key: 'sitemap',
      path: '/sitemap',
      namespace: 'common',
      priority: '0.1',
      changefreq: 'monthly',
      indexable: false,
      meta: locale => ({
        title: locale.common.seo.sitemap.title,
        description: locale.common.seo.sitemap.description,
        keywords: locale.common.seo.sitemap.keywords,
      }),
    },
    {
      key: 'login',
      path: '/login',
      namespace: 'common',
      priority: '0.1',
      changefreq: 'monthly',
      indexable: false,
      meta: locale => ({
        title: locale.common.seo.login.title,
        description: locale.common.seo.login.description,
        keywords: [],
      }),
    },
  ],
};
