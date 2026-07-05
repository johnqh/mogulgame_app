import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Section } from '@sudobility/components';
import { textVariants, designTokens, ui } from '@sudobility/design';
import LocalizedLink from '../components/layout/LocalizedLink';
import { SUPPORTED_LANGUAGES } from '../config/constants';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

const LANGUAGE_INFO: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇺🇸' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  es: { label: 'Español', flag: '🇪🇸' },
  fr: { label: 'Français', flag: '🇫🇷' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ko: { label: '한국어', flag: '🇰🇷' },
  pt: { label: 'Português', flag: '🇧🇷' },
  ru: { label: 'Русский', flag: '🇷🇺' },
  sv: { label: 'Svenska', flag: '🇸🇪' },
  th: { label: 'ไทย', flag: '🇹🇭' },
  uk: { label: 'Українська', flag: '🇺🇦' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  zh: { label: '中文', flag: '🇨🇳' },
  'zh-hant': { label: '繁體中文', flag: '🇹🇼' },
};

/** Sitemap page listing all supported languages and main navigation links. */
export default function SitemapPage() {
  const { t } = useTranslation('common');

  useEffect(() => {
    analyticsService.trackPageView('/sitemap', 'Sitemap');
  }, []);

  return (
    <Section spacing="md">
      <SEOHead
        title={t('seo.sitemap.title')}
        description={t('seo.sitemap.description')}
        keywords={t('seo.sitemap.keywords', { returnObjects: true }) as string[]}
        noIndex
      />
      <h1 className={`${textVariants.heading.h3()} mb-8`}>{t('nav.sitemap')}</h1>

      {/* Languages */}
      <div className="mb-12">
        <h2 className={`${textVariants.heading.h4()} mb-4`}>{t('sitemap.languages')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {SUPPORTED_LANGUAGES.map(code => {
            const info = LANGUAGE_INFO[code];
            return (
              <a
                key={code}
                href={`/${code}`}
                className={`flex items-center gap-2 px-3 py-2 ${designTokens.radius.md} border ${ui.border.default} hover:bg-accent text-sm`}
              >
                <span>{info?.flag}</span>
                <span className={textVariants.body.sm()}>{info?.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Main Pages */}
      <div className="mb-8">
        <h2 className={`${textVariants.heading.h4()} mb-4`}>{t('sitemap.mainPages')}</h2>
        <ul className="space-y-2">
          <li>
            <LocalizedLink to="/" className={ui.text.linkSubtle}>
              {t('nav.home')}
            </LocalizedLink>
          </li>
          <li>
            <LocalizedLink to="/how-to-play" className={ui.text.linkSubtle}>
              {t('nav.howToPlay')}
            </LocalizedLink>
          </li>
          <li>
            <LocalizedLink to="/leaderboard" className={ui.text.linkSubtle}>
              {t('nav.leaderboard')}
            </LocalizedLink>
          </li>
          <li>
            <LocalizedLink to="/offers" className={ui.text.linkSubtle}>
              {t('nav.offers')}
            </LocalizedLink>
          </li>
          <li>
            <LocalizedLink to="/login" className={ui.text.linkSubtle}>
              {t('nav.login')}
            </LocalizedLink>
          </li>
          <li>
            <LocalizedLink to="/settings" className={ui.text.linkSubtle}>
              {t('nav.settings')}
            </LocalizedLink>
          </li>
        </ul>
      </div>
    </Section>
  );
}
