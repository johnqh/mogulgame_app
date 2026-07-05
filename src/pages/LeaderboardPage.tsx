import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@sudobility/building_blocks/firebase';
import { useLeaderboard } from '@sudobility/mogulgame_client';
import { Section } from '@sudobility/components';
import { textVariants, designTokens, ui, variants, colors } from '@sudobility/design';
import type { CountryCode } from '@sudobility/mogulgame_types';
import { formatPrice as formatPriceLib } from '@sudobility/mogulgame_lib';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

const COUNTRY_FLAGS: Record<CountryCode, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  CA: '\u{1F1E8}\u{1F1E6}',
  GB: '\u{1F1EC}\u{1F1E7}',
  AE: '\u{1F1E6}\u{1F1EA}',
  ES: '\u{1F1EA}\u{1F1F8}',
  AU: '\u{1F1E6}\u{1F1FA}',
};

const COUNTRY_CODES: CountryCode[] = ['US', 'CA', 'GB', 'AE', 'ES', 'AU'];

function formatPrice(price: number, country: CountryCode): string {
  return formatPriceLib(price, country);
}

export default function LeaderboardPage() {
  const { t } = useTranslation('common');
  const { networkClient, baseUrl } = useApi();
  const [sortBy, setSortBy] = useState<'balance' | 'wins'>('balance');
  const [country, setCountry] = useState<CountryCode>('US');

  const { data, isLoading, error } = useLeaderboard(networkClient, baseUrl, country, sortBy);

  useEffect(() => {
    analyticsService.trackPageView('/leaderboard', 'Leaderboard');
  }, []);

  return (
    <Section spacing="md">
      <SEOHead
        title={t('leaderboard.title')}
        description={t('leaderboard.description')}
        keywords={['leaderboard', 'top players', 'real estate mogul', 'rankings', 'MogulGame']}
      />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className={textVariants.heading.h3()}>{t('leaderboard.title')}</h1>
          <div className="flex gap-1">
            {COUNTRY_CODES.map(c => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`px-2 py-1 ${designTokens.radius.full} text-sm ${ui.transition.default} ${
                  country === c
                    ? 'bg-primary/10 text-primary font-medium'
                    : `${ui.text.muted} hover:bg-accent`
                }`}
              >
                {COUNTRY_FLAGS[c]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setSortBy('balance');
              analyticsService.trackButtonClick('leaderboard_sort', { sortBy: 'balance' });
            }}
            className={`px-3 py-1 ${designTokens.radius.full} text-sm ${ui.transition.default} ${
              sortBy === 'balance'
                ? 'bg-primary/10 text-primary font-medium'
                : `${ui.text.muted} hover:bg-accent`
            }`}
          >
            {t('leaderboard.byBalance')}
          </button>
          <button
            onClick={() => {
              setSortBy('wins');
              analyticsService.trackButtonClick('leaderboard_sort', { sortBy: 'wins' });
            }}
            className={`px-3 py-1 ${designTokens.radius.full} text-sm ${ui.transition.default} ${
              sortBy === 'wins'
                ? 'bg-primary/10 text-primary font-medium'
                : `${ui.text.muted} hover:bg-accent`
            }`}
          >
            {t('leaderboard.byWins')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className={`mb-4 p-3 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.lg} text-sm`}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <div
            role="status"
            aria-label="Loading leaderboard"
            className={`${variants.loading.spinner.default()} mx-auto`}
          />
        </div>
      )}

      {/* Table */}
      {data && data.entries.length > 0 && (
        <div className={`${designTokens.radius.lg} border ${ui.border.default} overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-accent">
                <th className={`px-4 py-3 text-left ${textVariants.caption.default()}`}>
                  {t('leaderboard.rank')}
                </th>
                <th className={`px-4 py-3 text-left ${textVariants.caption.default()}`}>
                  {t('leaderboard.player')}
                </th>
                <th className={`px-4 py-3 text-right ${textVariants.caption.default()}`}>
                  {t('leaderboard.balance')}
                </th>
                <th className={`px-4 py-3 text-right ${textVariants.caption.default()}`}>
                  {t('leaderboard.wins')}
                </th>
                <th className={`px-4 py-3 text-right ${textVariants.caption.default()}`}>
                  {t('leaderboard.offers')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map(entry => (
                <tr
                  key={entry.user_id}
                  className={`border-b ${ui.border.default} last:border-0 hover:bg-accent ${ui.transition.default}`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`${textVariants.heading.h5()} ${
                        entry.rank <= 3 ? 'text-warning' : ''
                      }`}
                    >
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={textVariants.body.sm()}>
                      {entry.display_name ?? t('profile.anonymous')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right ${textVariants.body.sm()}`}>
                    {formatPrice(entry.pretend_balance, country)}
                  </td>
                  <td className={`px-4 py-3 text-right ${textVariants.body.sm()}`}>
                    {entry.total_wins}
                  </td>
                  <td className={`px-4 py-3 text-right ${textVariants.body.sm()} ${ui.text.muted}`}>
                    {entry.total_offers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.entries.length === 0 && !isLoading && (
        <p className={`text-center ${ui.text.muted} py-8`}>{t('leaderboard.empty')}</p>
      )}
    </Section>
  );
}
