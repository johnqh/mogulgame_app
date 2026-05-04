import { Navigate, useLocation } from 'react-router-dom';
import { isLanguageSupported } from '../../config/constants';

/**
 * Detect the user's preferred language by checking localStorage first,
 * then the browser's language list, falling back to English.
 */
function detectLanguage(): string {
  // Check localStorage
  try {
    const stored = localStorage.getItem('language');
    if (stored && isLanguageSupported(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }

  // Check browser language
  if (typeof navigator !== 'undefined') {
    const browserLangs = navigator.languages || [navigator.language];
    for (const lang of browserLangs) {
      const code = lang.toLowerCase().split('-')[0];
      if (isLanguageSupported(code)) {
        return code;
      }
      // Handle zh-Hant
      const full = lang.toLowerCase().replace('_', '-');
      if (full === 'zh-hant' || full === 'zh-tw' || full === 'zh-hk') {
        return 'zh-hant';
      }
    }
  }

  return 'en';
}

/**
 * Redirect component that sends the user to the language-prefixed version
 * of the current path based on their detected language preference.
 */
export default function LanguageRedirect() {
  const location = useLocation();
  const lang = detectLanguage();
  const path = location.pathname === '/' ? '' : location.pathname;
  return <Navigate to={`/${lang}${path}`} replace />;
}
