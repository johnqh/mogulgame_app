import { isLanguageSupported } from '../config/constants';
import type { SupportedLanguage } from '../config/constants';

/**
 * Extract language from URL path
 * @param pathname - URL pathname (e.g., "/en/docs" or "/docs")
 * @returns The language code if valid, null otherwise
 */
export function extractLanguageFromPath(pathname: string): SupportedLanguage | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length > 0) {
    const potentialLang = segments[0];
    if (isLanguageSupported(potentialLang)) {
      return potentialLang as SupportedLanguage;
    }
  }

  return null;
}

/**
 * Remove language prefix from a path
 * @param path - The path with potential language prefix
 * @returns The path without language prefix
 */
export function removeLanguageFromPath(path: string): string {
  const lang = extractLanguageFromPath(path);

  if (lang) {
    const segments = path.split('/').filter(Boolean);
    segments.shift(); // Remove the language segment
    return segments.length > 0 ? `/${segments.join('/')}` : '/';
  }

  return path;
}
