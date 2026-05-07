import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStatus } from '@sudobility/auth-components';
import { useApi } from '@sudobility/building_blocks/firebase';
import {
  useOffers,
  useUserProfile,
  StarterClient as MogulGameClient,
  QUERY_KEYS,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
} from '@sudobility/mogulgame_client';
import {
  countActiveOffers,
  countWonOffers,
  totalActiveOfferValue,
} from '@sudobility/mogulgame_lib';
import { Section } from '@sudobility/components';
import {
  textVariants,
  buttonVariant,
  designTokens,
  ui,
  variants,
  colors,
} from '@sudobility/design';
import type { PretendOffer, PretendOfferStatus, Property } from '@sudobility/mogulgame_types';
import { useQueries } from '@tanstack/react-query';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import LocalizedLink from '../components/layout/LocalizedLink';
import { formatDateTime } from '../utils/formatDateTime';
import { useSetPageConfig } from '../hooks/usePageConfig';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';
import { CONSTANTS } from '../config/constants';

const US_CENTER = { lat: 39.8283, lng: -98.5795 };
const US_ZOOM = 4;

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

function formatPriceShort(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
  return `$${price.toLocaleString()}`;
}

const STATUS_STYLES: Record<PretendOfferStatus, string> = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  expired: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

type FilterMode = 'all' | 'current' | 'past';
type ViewMode = 'map' | 'list';

function OfferCard({
  offer,
  locale,
  onCancel,
  onUpdate,
  isCancelling,
  isUpdating,
  cancellingId,
}: {
  offer: PretendOffer;
  locale: string;
  onCancel: (id: string) => void;
  onUpdate: (id: string, price: number) => void;
  isCancelling: boolean;
  isUpdating: boolean;
  cancellingId: string | null;
}) {
  const { t } = useTranslation('common');
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(String(offer.offer_price));

  const handleSave = () => {
    const price = Number(editPrice);
    if (Number.isNaN(price) || price <= 0) return;
    onUpdate(offer.id, price);
    setEditing(false);
  };

  return (
    <div className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2 mb-2">
              <span className={`${textVariants.body.sm()} ${ui.text.muted}`}>$</span>
              <input
                type="number"
                step="any"
                min="1"
                value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
                className={`w-40 px-2 py-1 ${designTokens.radius.md} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm`}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className={`${buttonVariant('primary')} ${designTokens.radius.md} text-xs ${ui.states.disabled}`}
              >
                {isUpdating ? '...' : t('common.save')}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditPrice(String(offer.offer_price));
                }}
                className={`${buttonVariant('outline')} ${designTokens.radius.md} text-xs`}
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <p className={textVariants.heading.h5()}>{formatPrice(offer.offer_price)}</p>
              <span
                className={`text-xs px-2 py-0.5 ${designTokens.radius.full} font-medium ${STATUS_STYLES[offer.status]}`}
              >
                {t(`offers.status.${offer.status}`)}
              </span>
              {offer.status === 'active' && (
                <button
                  onClick={() => setEditing(true)}
                  className={`${textVariants.caption.default()} ${ui.text.info} hover:underline`}
                >
                  {t('offers.edit')}
                </button>
              )}
            </div>
          )}
          <p className={`${textVariants.caption.default()} ${ui.text.muted} mt-1`}>
            {t('offers.placed')}: {formatDateTime(offer.created_at, locale)}
          </p>
          {offer.resolved_at && (
            <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
              {t('offers.resolved')}: {formatDateTime(offer.resolved_at, locale)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <LocalizedLink
            to={`/properties/${offer.property_id}`}
            className={`${buttonVariant('outline')} ${designTokens.radius.md} text-xs text-center`}
          >
            {t('offers.viewProperty')}
          </LocalizedLink>
          {offer.status === 'active' && !editing && (
            <>
              {showConfirm ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      onCancel(offer.id);
                      setShowConfirm(false);
                    }}
                    disabled={isCancelling && cancellingId === offer.id}
                    className={`${buttonVariant('destructive')} ${designTokens.radius.md} text-xs ${ui.states.disabled}`}
                  >
                    {isCancelling && cancellingId === offer.id ? '...' : t('common.confirm')}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className={`${buttonVariant('outline')} ${designTokens.radius.md} text-xs`}
                  >
                    {t('common.no')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className={`text-xs ${ui.text.muted} hover:${ui.text.error} ${ui.transition.default}`}
                >
                  {t('offers.cancelOffer')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Map marker for an offer with its property location */
function OfferMarker({
  offer,
  property,
  isSelected,
  onSelect,
}: {
  offer: PretendOffer;
  property: Property;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation('common');
  if (property.address.latitude == null || property.address.longitude == null) return null;

  return (
    <>
      <AdvancedMarker
        position={{
          lat: property.address.latitude,
          lng: property.address.longitude,
        }}
        onClick={() => onSelect(offer.id)}
      >
        <div
          className={`px-2 py-1 ${designTokens.radius.md} text-xs font-bold shadow-lg cursor-pointer ${
            isSelected
              ? 'bg-blue-600 text-white scale-110'
              : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white'
          }`}
          style={{ transform: isSelected ? 'scale(1.1)' : undefined }}
        >
          {formatPriceShort(offer.offer_price)}
        </div>
      </AdvancedMarker>
      {isSelected && (
        <InfoWindow
          position={{
            lat: property.address.latitude,
            lng: property.address.longitude,
          }}
          onCloseClick={() => onSelect(null)}
          pixelOffset={[0, -30]}
        >
          <LocalizedLink
            to={`/properties/${offer.property_id}`}
            className="block text-gray-900 no-underline hover:text-blue-600"
          >
            <div className="flex gap-2 items-center">
              {property.images.length > 0 && (
                <img
                  src={property.images[0]}
                  alt={property.normalized_address}
                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm leading-tight">
                    {formatPrice(offer.offer_price)}
                  </p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[offer.status]}`}
                  >
                    {t(`offers.status.${offer.status}`)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate leading-tight">
                  {property.address.street}
                  {property.address.unit ? `, ${property.address.unit}` : ''}
                </p>
                <p className="text-xs text-gray-600 leading-tight">
                  {property.address.city}, {property.address.state} {property.address.zip}
                </p>
              </div>
            </div>
          </LocalizedLink>
        </InfoWindow>
      )}
    </>
  );
}

/** Fits map bounds to offer markers whenever the set changes */
function OfferMapBoundsUpdater({
  offers,
  propertyMap,
}: {
  offers: PretendOffer[];
  propertyMap: Map<string, Property>;
}) {
  const map = useMap();
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (!map) return;
    const withCoords = offers.filter(o => {
      const p = propertyMap.get(o.property_id);
      return p?.address.latitude != null && p?.address.longitude != null;
    });
    if (withCoords.length === 0) return;

    const key = withCoords.map(o => o.id).join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const bounds = new google.maps.LatLngBounds();
    for (const o of withCoords) {
      const p = propertyMap.get(o.property_id)!;
      bounds.extend({ lat: p.address.latitude!, lng: p.address.longitude! });
    }
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, offers, propertyMap]);

  return null;
}

function OffersPageInner() {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStatus();
  const { networkClient, baseUrl, token } = useApi();

  const { offers, isLoading, error, cancelOffer, updateOffer, isCancelling, isUpdating } =
    useOffers(networkClient, baseUrl, token ?? null, { enabled: !!user });
  const { profile } = useUserProfile(networkClient, baseUrl, token ?? null, { enabled: !!user });

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  useSetPageConfig(
    viewMode === 'map' ? { scrollable: false, contentPadding: 'none', maxWidth: 'full' } : {}
  );

  useEffect(() => {
    analyticsService.trackPageView('/offers', 'Offers');
  }, []);

  // Split into current (active) and past (won/lost/cancelled/expired) offers
  const { currentOffers, pastOffers } = useMemo(() => {
    const current: PretendOffer[] = [];
    const past: PretendOffer[] = [];
    for (const o of offers) {
      if (o.status === 'active') {
        current.push(o);
      } else {
        past.push(o);
      }
    }
    return { currentOffers: current, pastOffers: past };
  }, [offers]);

  const filteredOffers = useMemo(() => {
    switch (filterMode) {
      case 'current':
        return currentOffers;
      case 'past':
        return pastOffers;
      default:
        return offers;
    }
  }, [filterMode, offers, currentOffers, pastOffers]);

  // Fetch property data for each unique property_id to get lat/lng for map
  const uniquePropertyIds = useMemo(() => [...new Set(offers.map(o => o.property_id))], [offers]);

  const client = useMemo(
    () => new MogulGameClient({ baseUrl, networkClient }),
    [baseUrl, networkClient]
  );

  const propertyQueries = useQueries({
    queries: uniquePropertyIds.map(propertyId => ({
      queryKey: QUERY_KEYS.property(propertyId),
      queryFn: async () => {
        const response = await client.getProperty(propertyId);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch property');
        }
        return response.data;
      },
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      enabled: !!user && uniquePropertyIds.length > 0,
    })),
  });

  const propertyMap = useMemo(() => {
    const result = new Map<string, Property>();
    for (const q of propertyQueries) {
      if (q.data) {
        result.set(q.data.id, q.data);
      }
    }
    return result;
  }, [propertyQueries]);

  if (!user) {
    return (
      <Section spacing="xl">
        <div className="text-center">
          <h1 className={`${textVariants.heading.h3()} mb-4`}>{t('offers.title')}</h1>
          <p className={`${textVariants.body.md()} mb-6`}>{t('offers.loginPrompt')}</p>
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

  const handleUpdate = async (offerId: string, price: number) => {
    try {
      analyticsService.trackButtonClick('update_offer', { offerId, price });
      await updateOffer(offerId, { offer_price: price });
      analyticsService.trackEvent('offer_updated');
    } catch {
      // error displayed via hook
    }
  };

  const handleCancel = async (offerId: string) => {
    setCancellingId(offerId);
    try {
      analyticsService.trackButtonClick('cancel_offer', { offerId });
      await cancelOffer(offerId);
      analyticsService.trackEvent('offer_cancelled');
    } catch {
      // error displayed via hook
    } finally {
      setCancellingId(null);
    }
  };

  const activeCount = countActiveOffers(offers);
  const wonCount = countWonOffers(offers);
  const activeValue = totalActiveOfferValue(offers);

  const activeTabStyle =
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium';
  const inactiveTabStyle = `${ui.text.muted} hover:bg-theme-hover-bg`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SEOHead title={t('offers.title')} description="" noIndex />

      {/* Stats + Controls */}
      <Section spacing="sm">
        <h1 className={`${textVariants.heading.h3()} mb-4`}>{t('offers.title')}</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div
            className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
          >
            <p className={textVariants.caption.default()}>{t('offers.balance')}</p>
            <p className={textVariants.heading.h4()}>
              {profile ? formatPrice(profile.pretend_usd_balance) : '...'}
            </p>
          </div>
          <div
            className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
          >
            <p className={textVariants.caption.default()}>{t('offers.activeOffers')}</p>
            <p className={textVariants.heading.h4()}>{activeCount}</p>
          </div>
          <div
            className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
          >
            <p className={textVariants.caption.default()}>{t('offers.totalCommitted')}</p>
            <p className={textVariants.heading.h4()}>{formatPrice(activeValue)}</p>
          </div>
          <div
            className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
          >
            <p className={textVariants.caption.default()}>{t('offers.wins')}</p>
            <p className={`${textVariants.heading.h4()} ${ui.text.info}`}>{wonCount}</p>
          </div>
        </div>

        {/* Filter + View Toggle Toolbar */}
        {offers.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            {/* Filter tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
                  filterMode === 'all' ? activeTabStyle : inactiveTabStyle
                }`}
              >
                {t('offers.allOffers')} ({offers.length})
              </button>
              <button
                onClick={() => setFilterMode('current')}
                className={`px-3 py-1 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
                  filterMode === 'current' ? activeTabStyle : inactiveTabStyle
                }`}
              >
                {t('offers.currentOffers')} ({currentOffers.length})
              </button>
              <button
                onClick={() => setFilterMode('past')}
                className={`px-3 py-1 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
                  filterMode === 'past' ? activeTabStyle : inactiveTabStyle
                }`}
              >
                {t('offers.pastOffers')} ({pastOffers.length})
              </button>
            </div>

            {/* View toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
                  viewMode === 'map' ? activeTabStyle : inactiveTabStyle
                }`}
              >
                {t('offers.mapView')}
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
                  viewMode === 'list' ? activeTabStyle : inactiveTabStyle
                }`}
              >
                {t('offers.listView')}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className={`mb-4 p-3 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.lg} text-sm`}
          >
            {error}
          </div>
        )}
      </Section>

      {/* Loading */}
      {isLoading && offers.length === 0 && (
        <div className="text-center py-8">
          <div
            role="status"
            aria-label="Loading offers"
            className={`${variants.loading.spinner.default()} mx-auto`}
          />
        </div>
      )}

      {/* Empty state */}
      {offers.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className={`${ui.text.muted} mb-4`}>{t('offers.empty')}</p>
          <LocalizedLink
            to="/"
            className={`${buttonVariant('primary')} ${designTokens.radius.lg} text-sm`}
          >
            {t('offers.browseProperties')}
          </LocalizedLink>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && filteredOffers.length > 0 && (
        <div className="flex-1 min-h-0">
          <GoogleMap
            defaultCenter={US_CENTER}
            defaultZoom={US_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="mogulgame-offers-map"
            className="w-full h-full"
          >
            <OfferMapBoundsUpdater offers={filteredOffers} propertyMap={propertyMap} />
            {filteredOffers.map(offer => {
              const property = propertyMap.get(offer.property_id);
              if (!property) return null;
              return (
                <OfferMarker
                  key={offer.id}
                  offer={offer}
                  property={property}
                  isSelected={selectedMarkerId === offer.id}
                  onSelect={setSelectedMarkerId}
                />
              );
            })}
          </GoogleMap>
        </div>
      )}

      {/* Map view but no results */}
      {viewMode === 'map' && filteredOffers.length === 0 && offers.length > 0 && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className={ui.text.muted}>{t('offers.empty')}</p>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredOffers.length > 0 && (
        <Section spacing="sm">
          <div className="space-y-3">
            {filteredOffers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                locale={i18n.language}
                onCancel={handleCancel}
                onUpdate={handleUpdate}
                isCancelling={isCancelling}
                isUpdating={isUpdating}
                cancellingId={cancellingId}
              />
            ))}
          </div>
        </Section>
      )}

      {/* List view but filtered to empty */}
      {viewMode === 'list' && filteredOffers.length === 0 && offers.length > 0 && !isLoading && (
        <div className="text-center py-8">
          <p className={ui.text.muted}>{t('offers.empty')}</p>
        </div>
      )}
    </div>
  );
}

export default function OffersPage() {
  useEffect(() => {
    analyticsService.trackPageView('/offers', 'Offers');
  }, []);

  return (
    <APIProvider apiKey={CONSTANTS.GOOGLE_MAPS_API_KEY}>
      <OffersPageInner />
    </APIProvider>
  );
}
