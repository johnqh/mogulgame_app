import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Section } from '@sudobility/components';
import { textVariants, buttonVariant, designTokens, ui } from '@sudobility/design';
import LocalizedLink from '../components/layout/LocalizedLink';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

/** How to Play page explaining the MogulGame rules. Uses localized strings. */
export default function HowToPlayPage() {
  const { t } = useTranslation('common');

  useEffect(() => {
    analyticsService.trackPageView('/how-to-play', 'HowToPlay');
  }, []);

  return (
    <Section spacing="md" maxWidth="3xl">
      <SEOHead title={t('howToPlay.seoTitle')} description={t('howToPlay.seoDescription')} />

      <h1 className={`${textVariants.heading.h2()} mb-8`}>{t('howToPlay.title')}</h1>

      {/* Overview */}
      <div className="mb-8">
        <p className={`${textVariants.body.lg()} leading-relaxed`}>{t('howToPlay.overview')}</p>
      </div>

      {/* Steps */}
      <div className="space-y-6 mb-10">
        {[1, 2, 3, 4, 5].map(step => (
          <div
            key={step}
            className={`flex gap-4 ${ui.spacing.card.md} ${designTokens.radius.lg} border ${ui.border.default}`}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{step}</span>
            </div>
            <div>
              <h3 className={`${textVariants.heading.h4()} mb-1`}>
                {t(`howToPlay.step${step}Title`)}
              </h3>
              <p className={`${textVariants.body.sm()} ${ui.text.muted} leading-relaxed`}>
                {t(`howToPlay.step${step}Desc`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Winning rules */}
      <div
        className={`mb-8 ${ui.spacing.card.md} ${designTokens.radius.lg} border ${ui.border.default}`}
      >
        <h2 className={`${textVariants.heading.h3()} mb-4`}>{t('howToPlay.winningTitle')}</h2>
        <div className="space-y-3">
          <p className={`${textVariants.body.sm()} leading-relaxed`}>
            {t('howToPlay.winningRule1')}
          </p>
          <p className={`${textVariants.body.sm()} leading-relaxed`}>
            {t('howToPlay.winningRule2')}
          </p>
          <p className={`${textVariants.body.sm()} leading-relaxed`}>
            {t('howToPlay.winningRule3')}
          </p>
        </div>
      </div>

      {/* Payout rules */}
      <div
        className={`mb-8 ${ui.spacing.card.md} ${designTokens.radius.lg} border ${ui.border.default}`}
      >
        <h2 className={`${textVariants.heading.h3()} mb-4`}>{t('howToPlay.payoutTitle')}</h2>
        <div className="space-y-3">
          <p className={`${textVariants.body.sm()} leading-relaxed`}>
            {t('howToPlay.payoutRule1')}
          </p>
          <p className={`${textVariants.body.sm()} leading-relaxed`}>
            {t('howToPlay.payoutRule2')}
          </p>
        </div>
      </div>

      {/* Example */}
      <div
        className={`mb-10 ${ui.spacing.card.md} ${designTokens.radius.lg} bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800`}
      >
        <h2 className={`${textVariants.heading.h4()} mb-3`}>{t('howToPlay.exampleTitle')}</h2>
        <p className={`${textVariants.body.sm()} leading-relaxed`}>{t('howToPlay.exampleText')}</p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <LocalizedLink
          to="/"
          className={`${buttonVariant('primary')} ${designTokens.radius.lg} px-8 py-3 ${ui.transition.default}`}
        >
          {t('howToPlay.startPlaying')}
        </LocalizedLink>
      </div>
    </Section>
  );
}
