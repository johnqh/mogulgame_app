import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '@sudobility/building_blocks/firebase';
import { usePropertySearch } from '@sudobility/mogulgame_client';
import {
  textVariants,
  buttonVariant,
  designTokens,
  ui,
  variants,
  colors,
} from '@sudobility/design';
import type { Property } from '@sudobility/mogulgame_types';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import LocalizedLink from '../components/layout/LocalizedLink';
import { useSetPageConfig } from '../hooks/usePageConfig';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';
import { CONSTANTS } from '../config/constants';

// Continental US center
const US_CENTER = { lat: 39.8283, lng: -98.5795 };
const US_ZOOM = 4;

function formatPrice(price: number | null): string {
  if (price == null) return 'N/A';
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
  return `$${price.toLocaleString()}`;
}

function formatPriceFull(price: number | null): string {
  if (price == null) return 'N/A';
  return `$${price.toLocaleString()}`;
}

/** Property card for the list view */
function PropertyCard({ property }: { property: Property }) {
  const statusColors: Record<string, string> = {
    for_sale: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    sold: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    delisted: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <LocalizedLink
      to={`/properties/${property.id}`}
      className={`block ${designTokens.radius.lg} border ${ui.border.default} overflow-hidden hover:bg-theme-hover-bg ${ui.transition.default}`}
    >
      {property.images.length > 0 ? (
        <div className="h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <img
            src={property.images[0]}
            alt={property.normalized_address}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className={`${ui.text.muted} text-sm`}>No image</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`${textVariants.heading.h5()} text-base`}>
            {formatPriceFull(property.price)}
          </p>
          <span
            className={`text-xs px-2 py-0.5 ${designTokens.radius.full} font-medium whitespace-nowrap ${statusColors[property.listing_status] ?? statusColors.unknown}`}
          >
            {property.listing_status.replace('_', ' ')}
          </span>
        </div>
        <p className={`${textVariants.body.sm()} ${ui.text.muted} line-clamp-1`}>
          {property.address.street}
          {property.address.unit ? `, ${property.address.unit}` : ''}, {property.address.city},{' '}
          {property.address.state}
        </p>
        <div className={`flex gap-3 text-xs ${ui.text.muted} mt-1`}>
          {property.bedrooms != null && <span>{property.bedrooms} bd</span>}
          {property.bathrooms != null && <span>{property.bathrooms} ba</span>}
          {property.sqft != null && <span>{property.sqft.toLocaleString()} sqft</span>}
        </div>
      </div>
    </LocalizedLink>
  );
}

/** Map marker with info window */
function PropertyMarker({
  property,
  isSelected,
  onSelect,
}: {
  property: Property;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  if (property.address.latitude == null || property.address.longitude == null) return null;

  return (
    <>
      <AdvancedMarker
        position={{
          lat: property.address.latitude,
          lng: property.address.longitude,
        }}
        onClick={() => onSelect(property.id)}
      >
        <div
          className={`px-2 py-1 ${designTokens.radius.md} text-xs font-bold shadow-lg cursor-pointer ${
            isSelected
              ? 'bg-blue-600 text-white scale-110'
              : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white'
          }`}
          style={{ transform: isSelected ? 'scale(1.1)' : undefined }}
        >
          {formatPrice(property.price)}
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
            to={`/properties/${property.id}`}
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
                <p className="font-bold text-sm leading-tight">{formatPriceFull(property.price)}</p>
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

/** Fits map bounds to property markers whenever the result set changes */
function MapBoundsUpdater({ properties }: { properties: Property[] }) {
  const map = useMap();
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (!map) return;
    const withCoords = properties.filter(
      p => p.address.latitude != null && p.address.longitude != null
    );
    if (withCoords.length === 0) return;

    // Build a key from property IDs to detect actual data changes
    const key = withCoords.map(p => p.id).join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const bounds = new google.maps.LatLngBounds();
    for (const p of withCoords) {
      bounds.extend({ lat: p.address.latitude!, lng: p.address.longitude! });
    }
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, properties]);

  return null;
}

type ViewMode = 'map' | 'list';

const EMPTY_PROPERTIES: Property[] = [];

/** Inner component rendered inside APIProvider so useMap() works */
function HomePageInner() {
  const { t } = useTranslation('common');
  const { networkClient, baseUrl } = useApi();
  const [urlParams, setUrlParams] = useSearchParams();

  // URL params are the source of truth for search state.
  // Use a key derived from URL to reset draft inputs on browser back/forward.
  const urlKey = urlParams.toString();
  const query = urlParams.get('q') ?? '';
  const minPrice = urlParams.get('min_price') ?? '';
  const maxPrice = urlParams.get('max_price') ?? '';
  const minBedrooms = urlParams.get('min_bedrooms') ?? '';
  const includeSold = urlParams.get('include_sold') === '1';
  const urlLat = urlParams.get('lat');
  const urlLng = urlParams.get('lng');

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Build API search params from URL params
  const searchParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (urlLat && urlLng) {
      params.latitude = urlLat;
      params.longitude = urlLng;
    } else if (query) {
      params.query = query;
    }
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (minBedrooms) params.min_bedrooms = minBedrooms;
    if (!includeSold) params.status = 'for_sale';
    return params;
  }, [query, urlLat, urlLng, minPrice, maxPrice, minBedrooms, includeSold]);

  const hasSearched = !!(query || (urlLat && urlLng));

  const { data, isLoading, error } = usePropertySearch(networkClient, baseUrl, searchParams, {
    enabled: hasSearched,
  });

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const q = (fd.get('q') as string)?.trim();
      if (!q) return;
      analyticsService.trackButtonClick('search_properties', { query: q });
      const params: Record<string, string> = { q };
      const mp = fd.get('min_price') as string;
      const xp = fd.get('max_price') as string;
      const mb = fd.get('min_bedrooms') as string;
      const is = fd.get('include_sold');
      if (mp && mp !== 'any') params.min_price = mp;
      if (xp && xp !== 'any') params.max_price = xp;
      if (mb && mb !== 'any') params.min_bedrooms = mb;
      if (is) params.include_sold = '1';
      setUrlParams(params, { replace: false });
      setSelectedMarkerId(null);
    },
    [setUrlParams]
  );

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        analyticsService.trackButtonClick('current_location', { latitude, longitude });
        const params: Record<string, string> = {
          q: 'Near me',
          lat: String(latitude),
          lng: String(longitude),
        };
        setUrlParams(params, { replace: false });
        setSelectedMarkerId(null);
        setLocatingUser(false);
      },
      () => {
        setLocatingUser(false);
      }
    );
  }, [setUrlParams]);

  const properties = data?.properties ?? EMPTY_PROPERTIES;
  const hasResults = hasSearched && properties.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SEOHead title={t('seo.home.title')} description={t('seo.home.description')} />

      {/* Search bar */}
      <div className={`border-b ${ui.border.default} bg-theme-bg-primary`}>
        <form key={urlKey} onSubmit={handleSearch} className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex-1 flex gap-2">
              <input
                name="q"
                type="text"
                defaultValue={query}
                placeholder={t('search.placeholder')}
                className={`flex-1 h-10 px-4 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm`}
              />
              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={locatingUser}
                className={`h-10 w-10 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm hover:bg-theme-hover-bg ${ui.transition.default} ${ui.states.disabled} flex-shrink-0 flex items-center justify-center`}
                title={t('search.currentLocation')}
              >
                {locatingUser ? (
                  '...'
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <select
                name="min_price"
                defaultValue={minPrice || 'any'}
                className={`h-10 w-28 px-3 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm`}
              >
                <option value="any">{t('search.minPrice')}</option>
                <option value="100000">$100K</option>
                <option value="200000">$200K</option>
                <option value="300000">$300K</option>
                <option value="500000">$500K</option>
                <option value="750000">$750K</option>
                <option value="1000000">$1M</option>
                <option value="2000000">$2M</option>
                <option value="5000000">$5M</option>
              </select>
              <select
                name="max_price"
                defaultValue={maxPrice || 'any'}
                className={`h-10 w-28 px-3 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm`}
              >
                <option value="any">{t('search.maxPrice')}</option>
                <option value="200000">$200K</option>
                <option value="300000">$300K</option>
                <option value="500000">$500K</option>
                <option value="750000">$750K</option>
                <option value="1000000">$1M</option>
                <option value="2000000">$2M</option>
                <option value="5000000">$5M</option>
                <option value="10000000">$10M</option>
              </select>
              <select
                name="min_bedrooms"
                defaultValue={minBedrooms || 'any'}
                className={`h-10 w-24 px-3 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm`}
              >
                <option value="any">{t('search.beds')}</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  name="include_sold"
                  type="checkbox"
                  defaultChecked={includeSold}
                  className="rounded"
                />
                <span className={`${ui.text.muted} whitespace-nowrap`}>
                  {t('search.includeSold')}
                </span>
              </label>
              <button
                type="submit"
                className={`h-10 ${buttonVariant('primary')} ${designTokens.radius.lg} text-sm px-5`}
              >
                {t('search.button')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* View toggle + results count */}
      {(hasResults || (hasSearched && isLoading)) && (
        <div
          className={`flex items-center justify-between px-4 py-2 border-b ${ui.border.default} bg-theme-bg-primary max-w-7xl mx-auto w-full`}
        >
          <p className={`${textVariants.body.sm()} ${ui.text.muted}`}>
            {data ? t('search.resultCount', { count: data.total }) : t('common.loading')}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
                viewMode === 'map'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                  : `${ui.text.muted} hover:bg-theme-hover-bg`
              }`}
            >
              {t('search.mapView')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                  : `${ui.text.muted} hover:bg-theme-hover-bg`
              }`}
            >
              {t('search.listView')}
            </button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-h-0 relative">
        {/* Error */}
        {error && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div
              role="alert"
              className={`p-3 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.lg} text-sm shadow-lg`}
            >
              {error}
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-theme-bg-primary/50">
            <div
              role="status"
              aria-label="Searching properties"
              className={variants.loading.spinner.default()}
            />
          </div>
        )}

        {/* No results */}
        {hasSearched && data && properties.length === 0 && !isLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div
              className={`px-4 py-2 ${designTokens.radius.lg} bg-theme-bg-primary shadow-lg border ${ui.border.default}`}
            >
              <p className={ui.text.muted}>{t('search.noResults')}</p>
            </div>
          </div>
        )}

        {/* Map view (always rendered, shows markers when results exist) */}
        {viewMode === 'map' && (
          <div className="h-full flex">
            <div className="flex-1 min-h-0">
              <Map
                defaultCenter={US_CENTER}
                defaultZoom={US_ZOOM}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="mogulgame-map"
                className="w-full h-full"
              >
                <MapBoundsUpdater properties={properties} />
                {properties.map(p => (
                  <PropertyMarker
                    key={p.id}
                    property={p}
                    isSelected={selectedMarkerId === p.id}
                    onSelect={setSelectedMarkerId}
                  />
                ))}
              </Map>
            </div>
            {/* Side list (desktop only, when results exist) */}
            {hasResults && (
              <div className="hidden lg:block w-80 border-l overflow-y-auto bg-theme-bg-primary">
                <div className="p-3 space-y-3">
                  {properties.map(p => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && hasResults && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {properties.map(p => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
              {data?.has_more && (
                <p className={`text-center ${textVariants.body.sm()} ${ui.text.muted} mt-6`}>
                  {t('search.showingOf', { shown: properties.length, total: data.total })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* List view but no results yet */}
        {viewMode === 'list' && !hasResults && !isLoading && (
          <div className="h-full flex items-center justify-center">
            <p className={ui.text.muted}>{t('search.placeholder')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  useSetPageConfig({ scrollable: false, contentPadding: 'none', maxWidth: 'full' });

  useEffect(() => {
    analyticsService.trackPageView('/', 'Home');
  }, []);

  return (
    <APIProvider apiKey={CONSTANTS.GOOGLE_MAPS_API_KEY}>
      <HomePageInner />
    </APIProvider>
  );
}
