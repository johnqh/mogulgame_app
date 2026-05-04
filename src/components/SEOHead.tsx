import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { usePageSEO } from '@sudobility/seo_lib';
import { SEO_CONFIG, isNonProductionHost } from '../config/seo';

export interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string[];
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route SEO component.
 *
 * Derives canonical URL and language from the current route, builds the
 * WebApplication schema, and delegates all DOM manipulation to usePageSEO.
 *
 * Pages provide localized title, description, keywords, and structured data.
 * This component handles everything else automatically.
 */
export default function SEOHead({
  title,
  description,
  keywords,
  ogType = 'website',
  noIndex = false,
  structuredData,
}: SEOHeadProps) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const lang = i18n.language || 'en';
  const { baseUrl, appName, defaultOgImage, twitterHandle, supportedLanguages, defaultLanguage } =
    SEO_CONFIG;

  // Canonical URL: use language from the URL path (not i18n preference)
  const urlLangMatch = location.pathname.match(/^\/([a-z]{2}(-[a-z]+)?)(\/|$)/);
  const urlLang = urlLangMatch ? urlLangMatch[1] : lang;
  const pathWithoutLang = location.pathname.replace(/^\/[a-z]{2}(-[a-z]+)?\//, '/');
  const canonical = `${baseUrl}/${urlLang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;

  const shouldNoIndex = noIndex || isNonProductionHost();

  // WebApplication schema — always included, localized
  const { t: tHowTo } = useTranslation('howto');
  const webAppSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: appName,
      url: baseUrl,
      applicationCategory: 'DeveloperApplication',
      applicationSubCategory: 'Project Template',
      description: tHowTo('webApp.description'),
      operatingSystem: 'Web',
      dateModified: new Date().toISOString().split('T')[0],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: tHowTo('webApp.features', { returnObjects: true }) as string[],
    }),
    [appName, baseUrl, tHowTo]
  );

  // Combine WebApplication + page-specific schemas
  const pageSchemas = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];
  const pageSchemasKey = JSON.stringify(pageSchemas);
  const schemas = useMemo(
    () => [webAppSchema, ...pageSchemas],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [webAppSchema, pageSchemasKey]
  );

  // Single hook handles all DOM manipulation
  usePageSEO(
    {
      title,
      description,
      keywords,
      canonical,
      lang: urlLang,
      pathWithoutLang,
      ogType,
      noIndex: shouldNoIndex,
      structuredData: schemas,
    },
    {
      appName,
      baseUrl,
      defaultOgImage,
      twitterHandle,
      supportedLanguages,
      defaultLanguage,
    }
  );

  return null;
}
