import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStatus } from '@sudobility/auth-components';
import { useApi } from '@sudobility/building_blocks/firebase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { FavoriteButton } from '../components/FavoriteButton';
import {
  StarterClient as MogulGameClient,
  QUERY_KEYS,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
} from '@sudobility/mogulgame_client';
import type { Property } from '@sudobility/mogulgame_types';
import { useQueries } from '@tanstack/react-query';

export default function MyFavoritesPage() {
  const { t } = useTranslation('common');
  const { user } = useAuthStatus();
  const { networkClient, baseUrl, token } = useApi();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  useEffect(() => {
    analyticsService.trackPageView('/my-favorites', 'My Favorites');
  }, []);

  const client = useMemo(
    () => new MogulGameClient({ baseUrl, networkClient }),
    [baseUrl, networkClient]
  );
  const authHeaders = useMemo(
    (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // Fetch favorites list
  const { data, isLoading, error } = useQuery({
    queryKey: ['mogulgame', 'favorites', page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      const response = await networkClient.get(`${baseUrl}/api/v1/favorites?${params}`, {
        headers: authHeaders,
      });
      const body = response.data as {
        success: boolean;
        data?: {
          favorites: { property_id: string; created_at: string }[];
          total: number;
          page: number;
          limit: number;
          has_more: boolean;
        };
        error?: string;
      };
      if (!body.success || !body.data) {
        throw new Error(body.error || 'Failed to fetch favorites');
      }
      return body.data;
    },
    enabled: !!user && !!token,
    staleTime: 60_000,
  });

  const favorites = data?.favorites ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  // Fetch property details for each favorite
  const propertyQueries = useQueries({
    queries: favorites.map((f: { property_id: string }) => ({
      queryKey: QUERY_KEYS.property(f.property_id),
      queryFn: async () => {
        const response = await client.getProperty(f.property_id);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch property');
        }
        return response.data;
      },
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      enabled: !!user && favorites.length > 0,
    })),
  });

  const propertyMap = useMemo(() => {
    const result = new Map<string, Property>();
    for (const q of propertyQueries) {
      if (q.data) result.set(q.data.id, q.data);
    }
    return result;
  }, [propertyQueries]);

  // Unfavorite mutation
  const unfavoriteMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return networkClient.delete(`${baseUrl}/api/v1/favorites/${propertyId}`, {
        headers: authHeaders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mogulgame', 'favorites'] });
    },
  });

  const handleUnfavorite = useCallback(
    async (propertyId: string) => {
      await unfavoriteMutation.mutateAsync(propertyId);
    },
    [unfavoriteMutation]
  );

  if (!user) {
    return (
      <Section spacing="xl">
        <div className="text-center">
          <h1 className={`${textVariants.heading.h3()} mb-4`}>{t('favorites.title')}</h1>
          <p className={`${textVariants.body.md()} mb-6`}>{t('favorites.loginPrompt')}</p>
          <LocalizedLink
            to="/login"
            className={`${buttonVariant('primary')} ${designTokens.radius.lg} px-6 py-3`}
          >
            {t('nav.login')}
          </LocalizedLink>
        </div>
      </Section>
    );
  }

  return (
    <Section spacing="md">
      <SEOHead title={t('favorites.title')} description="" noIndex />
      <h1 className={`${textVariants.heading.h3()} mb-6`}>{t('favorites.title')}</h1>

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
          {error instanceof Error ? error.message : 'Failed to load favorites'}
        </div>
      )}

      {!isLoading && favorites.length === 0 && !error && (
        <div className="text-center py-8">
          <p className={`${ui.text.muted} mb-4`}>{t('favorites.empty')}</p>
          <LocalizedLink
            to="/"
            className={`${buttonVariant('primary')} ${designTokens.radius.lg} text-sm`}
          >
            {t('offers.browseProperties')}
          </LocalizedLink>
        </div>
      )}

      {favorites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map(fav => {
            const property = propertyMap.get(fav.property_id);
            const image = property?.images[0] ?? null;
            const address = property
              ? `${property.address.street}, ${property.address.city}, ${property.address.region}`
              : '...';

            return (
              <div
                key={fav.property_id}
                className={`relative ${designTokens.radius.lg} border ${ui.border.default} overflow-hidden`}
              >
                <LocalizedLink
                  to={`/properties/${fav.property_id}`}
                  className={`block hover:bg-theme-hover-bg ${ui.transition.default}`}
                >
                  {image ? (
                    <div className="h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <img
                        src={image}
                        alt={address}
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
                      {address}
                    </p>
                  </div>
                </LocalizedLink>
                <div className="absolute top-2 right-2">
                  <FavoriteButton
                    isFavorited={true}
                    onToggle={() => handleUnfavorite(fav.property_id)}
                    size="sm"
                    className="bg-white/80 dark:bg-gray-900/80 rounded-full p-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

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
