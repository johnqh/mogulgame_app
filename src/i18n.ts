import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LANGUAGES, isLanguageSupported } from './config/constants';

/**
 * Attempt to determine the initial language from the URL path, then
 * localStorage, falling back to English. This runs before i18next's
 * own detection so that the first render already has the right locale.
 */
const detectLanguageFromPath = (): string => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const pathLang = window.location.pathname.split('/')[1];
  if (pathLang && isLanguageSupported(pathLang)) {
    return pathLang;
  }

  try {
    const stored = localStorage.getItem('language');
    if (stored && isLanguageSupported(stored)) {
      return stored;
    }
  } catch {
    // localStorage may throw in Safari private browsing
  }

  return 'en';
};

let initialized = false;

/**
 * One-time initialisation of i18next with the HTTP backend, browser
 * language detection, and React integration. Safe to call multiple
 * times; subsequent calls are no-ops.
 */
export function initializeI18n(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: detectLanguageFromPath(),
      fallbackLng: {
        zh: ['zh', 'en'],
        'zh-hant': ['zh-hant', 'zh', 'en'],
        default: ['en'],
      },
      initImmediate: false,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      backend: {
        loadPath: `/locales/{{lng}}/{{ns}}.json`,
      },
      detection: {
        order: ['path', 'localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'language',
        lookupFromPathIndex: 0,
      },
      load: 'currentOnly',
      preload: [],
      cleanCode: false,
      lowerCaseLng: true,
      nonExplicitSupportedLngs: false,
      defaultNS: 'common',
      ns: ['common', 'howto'],
    });
}

export default i18n;
