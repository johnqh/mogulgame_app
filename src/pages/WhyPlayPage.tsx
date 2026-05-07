import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Section } from '@sudobility/components';
import { textVariants, buttonVariant, designTokens, ui } from '@sudobility/design';
import LocalizedLink from '../components/layout/LocalizedLink';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

export default function WhyPlayPage() {
  const { t } = useTranslation('common');

  useEffect(() => {
    analyticsService.trackPageView('/why-play', 'WhyPlay');
  }, []);

  return (
    <Section spacing="md">
      <SEOHead
        title={t('whyPlay.seoTitle')}
        description={t('whyPlay.seoDescription')}
        keywords={[
          'real estate practice',
          'home buying confidence',
          'property pricing simulator',
          'first time home buyer',
          'paper trading real estate',
          'real estate game',
          'MogulGame',
        ]}
        ogType="article"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: t('whyPlay.heroTitle'),
          description: t('whyPlay.seoDescription'),
          author: { '@type': 'Organization', name: 'MogulGame' },
        }}
      />

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className={`${textVariants.heading.h1()} mb-4`}>{t('whyPlay.heroTitle')}</h1>
        <p
          className={`${textVariants.body.lg()} ${ui.text.muted} max-w-2xl mx-auto leading-relaxed`}
        >
          {t('whyPlay.heroSubtitle')}
        </p>
      </div>

      {/* Section 1: The Stakes Are Real */}
      <div
        className={`mb-10 ${ui.spacing.card.lg} ${designTokens.radius.xl} border ${ui.border.default}`}
      >
        <h2 className={`${textVariants.heading.h3()} mb-4`}>{t('whyPlay.stakesTitle')}</h2>
        <div className="space-y-3">
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.stakesP1')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.stakesP2')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.stakesP3')}
          </p>
        </div>
      </div>

      {/* Section 2: Paper Trading for Real Estate */}
      <div
        className={`mb-10 ${ui.spacing.card.lg} ${designTokens.radius.xl} bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800`}
      >
        <h2 className={`${textVariants.heading.h3()} mb-4`}>{t('whyPlay.paperTradingTitle')}</h2>
        <div className="space-y-3">
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.paperTradingP1')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.paperTradingP2')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.paperTradingP3')}
          </p>
        </div>
      </div>

      {/* Section 3: Real Properties, Real Learning */}
      <div
        className={`mb-10 ${ui.spacing.card.lg} ${designTokens.radius.xl} border ${ui.border.default}`}
      >
        <h2 className={`${textVariants.heading.h3()} mb-4`}>{t('whyPlay.realLearningTitle')}</h2>
        <div className="space-y-3">
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.realLearningP1')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.realLearningP2')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.realLearningP3')}
          </p>
        </div>
      </div>

      {/* Section 4: Build Your Pricing Instincts */}
      <div
        className={`mb-10 ${ui.spacing.card.lg} ${designTokens.radius.xl} bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800`}
      >
        <h2 className={`${textVariants.heading.h3()} mb-4`}>{t('whyPlay.instinctsTitle')}</h2>
        <div className="space-y-3">
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.instinctsP1')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.instinctsP2')}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
            {t('whyPlay.instinctsP3')}
          </p>
        </div>
      </div>

      {/* How to Play link */}
      <div className="text-center mb-6">
        <LocalizedLink
          to="/how-to-play"
          className={`${textVariants.body.md()} ${ui.text.info} hover:underline font-medium`}
        >
          {t('whyPlay.howToPlayLink')} &rarr;
        </LocalizedLink>
      </div>

      {/* CTA */}
      <div className="text-center">
        <LocalizedLink
          to="/"
          className={`${buttonVariant('primary')} ${designTokens.radius.lg} px-8 py-3 ${ui.transition.default}`}
        >
          {t('whyPlay.cta')}
        </LocalizedLink>
      </div>
    </Section>
  );
}
