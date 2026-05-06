import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@sudobility/building_blocks/firebase';
import { useQuery } from '@tanstack/react-query';
import { Section } from '@sudobility/components';
import { textVariants, designTokens, ui, variants, colors } from '@sudobility/design';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

interface SearchData {
  type: string;
  query?: string;
  latitude?: number;
  longitude?: number;
  zip?: string;
  status?: string;
  sold_within_months?: number;
  result_count?: number;
}

interface RecentSearch {
  search_data: SearchData;
  searched_at: string;
}

function searchDataToUrlParams(data: SearchData): string {
  const params = new URLSearchParams();
  if (data.type === 'search') {
    if (data.query) params.set('q', data.query);
    if (data.latitude) params.set('lat', String(data.latitude));
    if (data.longitude) params.set('lng', String(data.longitude));
  } else if (data.type === 'status') {
    if (data.status === 'sold') params.set('recently_sold', '1');
  } else if (data.type === 'with_offers') {
    params.set('with_offers', '1');
  }
  return params.toString();
}

function searchDataLabel(data: SearchData): string {
  if (data.type === 'search') return data.query || data.zip || 'Search';
  if (data.type === 'status') return `Status: ${data.status}`;
  if (data.type === 'with_offers') return 'With Offers';
  return 'Search';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentSearchesPage() {
  const { t } = useTranslation('common');
  const { networkClient, baseUrl } = useApi();
  const { navigate } = useLocalizedNavigate();

  useEffect(() => {
    analyticsService.trackPageView('/recent-searches', 'Recent Searches');
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['mogulgame', 'recentSearches'],
    queryFn: async () => {
      const response = await networkClient.get(`${baseUrl}/api/v1/searches/recent`);
      const body = response.data as {
        success: boolean;
        data?: { searches: RecentSearch[]; total: number };
        error?: string;
      };
      if (!body.success || !body.data) {
        throw new Error(body.error || 'Failed to fetch recent searches');
      }
      return body.data;
    },
    staleTime: 60_000,
  });

  const searches = useMemo(() => data?.searches ?? [], [data]);

  const handleSearchClick = (search: RecentSearch) => {
    const qs = searchDataToUrlParams(search.search_data);
    navigate(`/${qs ? `?${qs}` : ''}`);
  };

  return (
    <Section spacing="md">
      <SEOHead
        title={t('recentSearches.seoTitle')}
        description={t('recentSearches.seoDescription')}
      />
      <h1 className={`${textVariants.heading.h3()} mb-6`}>{t('recentSearches.title')}</h1>

      {isLoading && (
        <div className="text-center py-8">
          <div
            role="status"
            aria-label="Loading"
            className={`${variants.loading.spinner.default()} mx-auto`}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className={`mb-4 p-3 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.lg} text-sm`}
        >
          {error instanceof Error ? error.message : 'Failed to load recent searches'}
        </div>
      )}

      {!isLoading && searches.length === 0 && !error && (
        <div className="text-center py-8">
          <p className={ui.text.muted}>{t('recentSearches.empty')}</p>
        </div>
      )}

      {searches.length > 0 && (
        <div className="space-y-2">
          {searches.map((search, i) => (
            <button
              key={i}
              onClick={() => handleSearchClick(search)}
              className={`w-full text-left ${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default} hover:bg-theme-hover-bg ${ui.transition.default} flex items-center justify-between gap-3`}
            >
              <div className="min-w-0">
                <p className={`${textVariants.body.md()} font-medium truncate`}>
                  {searchDataLabel(search.search_data)}
                </p>
                {search.search_data.result_count != null && (
                  <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                    {t('recentSearches.results', { count: search.search_data.result_count })}
                  </p>
                )}
              </div>
              <span className={`${textVariants.caption.default()} ${ui.text.muted} flex-shrink-0`}>
                {timeAgo(search.searched_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}
