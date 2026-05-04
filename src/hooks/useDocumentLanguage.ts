import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Languages written right-to-left that require the `dir="rtl"` attribute. */
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * Synchronises the `<html>` element's `lang` and `dir` attributes with
 * the current i18next language so that assistive technologies and
 * CSS selectors see the correct values.
 */
export function useDocumentLanguage() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  useEffect(() => {
    if (!currentLanguage) return;
    document.documentElement.lang = currentLanguage;
    const isRtl = RTL_LANGUAGES.includes(currentLanguage);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [currentLanguage]);
}
