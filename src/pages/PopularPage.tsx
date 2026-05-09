import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@sudobility/building_blocks/firebase';
import { useQuery } from '@tanstack/react-query';
import { Section } from '@sudobility/components';
import {
  textVariants,
  buttonVariant,
  designTokens,
  ui,
  variants,
  colors,
} from '@sudobility/design';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';
import LocalizedLink from '../components/layout/LocalizedLink';

interface PropertyView {
  id: string;
  property_id: string;
  address: string;
  image_url: string | null;
  view_count: number;
  offer_count?: number;
  last_viewed_at: string;
}

interface PropertyViewsResponse {
  views: PropertyView[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

type SortBy = 'popularity' | 'recent' | 'favorites' | 'with_offers';

export default function PopularPage() {
  const { t } = useTranslation('common');
  const { networkClient, baseUrl } = useApi();
  const [sortBy, setSortBy] = useState<SortBy>('popularity');
  const [page, setPage] = useState(1);

  useEffect(() => {
    analyticsService.trackPageView('/popular', 'Popular');
  }, []);

  const handleSortChange = (newSort: SortBy) => {
    setSortBy(newSort);
    setPage(1);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['mogulgame', 'popular', sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        sort_by: sortBy,
        page: String(page),
        limit: '25',
      });
      const response = await networkClient.get(`${baseUrl}/api/v1/views/popular?${params}`);
      const body = response.data as {
        success: boolean;
        data?: PropertyViewsResponse;
        error?: string;
      };
      if (!body.success || !body.data) {
        throw new Error(body.error || 'Failed to fetch popular properties');
      }
      return body.data;
    },
    staleTime: 60_000,
  });

  const views = data?.views ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <Section spacing="md">
      <SEOHead
        title={t('popular.seoTitle')}
        description={t('popular.seoDescription')}
        keywords={['popular properties', 'most viewed homes', 'trending real estate', 'MogulGame']}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className={textVariants.heading.h3()}>{t('popular.title')}</h1>
        <div className="flex gap-1">
          <button
            onClick={() => {
              handleSortChange('popularity');
              analyticsService.trackButtonClick('popular_sort', { sortBy: 'popularity' });
            }}
            className={`px-3 py-1 ${designTokens.radius.full} text-sm ${ui.transition.default} ${
              sortBy === 'popularity'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                : `${ui.text.muted} hover:bg-theme-hover-bg`
            }`}
          >
            {t('popular.byPopularity')}
          </button>
          <button
            onClick={() => {
              handleSortChange('recent');
              analyticsService.trackButtonClick('popular_sort', { sortBy: 'recent' });
            }}
            className={`px-3 py-1 ${designTokens.radius.full} text-sm ${ui.transition.default} ${
              sortBy === 'recent'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                : `${ui.text.muted} hover:bg-theme-hover-bg`
            }`}
          >
            {t('popular.byRecent')}
          </button>
          <button
            onClick={() => {
              handleSortChange('favorites');
              analyticsService.trackButtonClick('popular_sort', { sortBy: 'favorites' });
            }}
            className={`px-3 py-1 ${designTokens.radius.full} text-sm ${ui.transition.default} ${
              sortBy === 'favorites'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                : `${ui.text.muted} hover:bg-theme-hover-bg`
            }`}
          >
            {t('popular.byFavorites')}
          </button>
          <button
            onClick={() => {
              handleSortChange('with_offers');
              analyticsService.trackButtonClick('popular_sort', { sortBy: 'with_offers' });
            }}
            className={`px-3 py-1 ${designTokens.radius.full} text-sm ${ui.transition.default} ${
              sortBy === 'with_offers'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                : `${ui.text.muted} hover:bg-theme-hover-bg`
            }`}
          >
            {t('popular.byOffers')}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <div
            role="status"
            aria-label="Loading"
            className={`${variants.loading.spinner.default()} mx-auto`}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className={`mb-4 p-3 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.lg} text-sm`}
        >
          {error instanceof Error ? error.message : 'Failed to load'}
        </div>
      )}

      {/* Empty */}
      {!isLoading && views.length === 0 && !error && (
        <div className="text-center py-8">
          <p className={ui.text.muted}>{t('popular.empty')}</p>
        </div>
      )}

      {/* Property grid */}
      {views.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {views.map(view => (
            <LocalizedLink
              key={view.id}
              to={`/properties/${view.property_id}`}
              className={`block ${designTokens.radius.lg} border ${ui.border.default} overflow-hidden hover:bg-theme-hover-bg ${ui.transition.default}`}
            >
              {view.image_url ? (
                <div className="h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <img
                    src={view.image_url}
                    alt={view.address}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className={`${ui.text.muted} text-sm`}>{t('property.noImage')}</span>
                </div>
              )}
              <div className="p-3">
                <p className={`${textVariants.body.sm()} ${ui.text.muted} line-clamp-2`}>
                  {view.address}
                </p>
                <p className={`${textVariants.caption.default()} ${ui.text.muted} mt-1`}>
                  {sortBy === 'with_offers' && view.offer_count != null
                    ? t('popular.offerCount', { count: view.offer_count })
                    : t('popular.views', { count: view.view_count })}
                </p>
              </div>
            </LocalizedLink>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`${buttonVariant('outline')} ${designTokens.radius.lg} text-sm ${ui.states.disabled}`}
          >
            {t('popular.prev')}
          </button>
          <span className={`${textVariants.body.sm()} ${ui.text.muted}`}>
            {t('popular.page', { page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!data?.has_more}
            className={`${buttonVariant('outline')} ${designTokens.radius.lg} text-sm ${ui.states.disabled}`}
          >
            {t('popular.next')}
          </button>
        </div>
      )}
    </Section>
  );
}
