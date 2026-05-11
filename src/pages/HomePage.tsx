import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '@sudobility/building_blocks/firebase';
import { useAuthStatus } from '@sudobility/auth-components';
import { usePropertySearch } from '@sudobility/mogulgame_client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  textVariants,
  buttonVariant,
  designTokens,
  ui,
  variants,
  colors,
} from '@sudobility/design';
import type { Property, CountryCode } from '@sudobility/mogulgame_types';
import {
  formatPrice as formatPriceLib,
  formatPriceShort as formatPriceShortLib,
} from '@sudobility/mogulgame_lib';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import {
  Section,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Switch,
} from '@sudobility/components';
import LocalizedLink from '../components/layout/LocalizedLink';
import { FavoriteButton } from '../components/FavoriteButton';
import { useSetPageConfig } from '../hooks/usePageConfig';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';
import { CONSTANTS } from '../config/constants';

// Country configuration
const COUNTRY_OPTIONS: {
  code: CountryCode;
  flag: string;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
}[] = [
  { code: 'US', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', center: { lat: 39.8283, lng: -98.5795 }, zoom: 4 },
  { code: 'CA', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada', center: { lat: 56.1304, lng: -106.3468 }, zoom: 4 },
  { code: 'GB', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom', center: { lat: 54.0, lng: -2.0 }, zoom: 6 },
  { code: 'AE', flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE', center: { lat: 24.4539, lng: 54.3773 }, zoom: 8 },
  { code: 'ES', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain', center: { lat: 40.4637, lng: -3.7492 }, zoom: 6 },
  { code: 'AU', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia', center: { lat: -25.2744, lng: 133.7751 }, zoom: 4 },
];

const STORAGE_KEY = 'mogulgame_selected_country';

function getStoredCountry(): CountryCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && COUNTRY_OPTIONS.some(c => c.code === stored)) return stored as CountryCode;
  } catch {
    // ignore
  }
  return 'US';
}

// =============================================================================
// Search History (localStorage)
// =============================================================================

const SEARCH_HISTORY_KEY = 'mogulgame_search_history';
const MAX_HISTORY = 10;

interface SearchHistoryEntry {
  query: string;
  params: Record<string, string>;
  timestamp: number;
}

function getSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSearchToHistory(query: string, params: Record<string, string>) {
  if (!query.trim()) return;
  const history = getSearchHistory().filter(h => h.query.toLowerCase() !== query.toLowerCase());
  history.unshift({ query, params, timestamp: Date.now() });
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

// =============================================================================
// Welcome Overlay
// =============================================================================

const WELCOME_SEEN_KEY = 'mogulgame_welcome_seen';

function WelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation('common');

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
      <div
        className={`mx-4 max-w-lg ${designTokens.radius.xl} bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border ${ui.border.default} p-6 sm:p-8`}
      >
        <h2 className={`${textVariants.heading.h3()} mb-5 text-center`}>{t('welcome.title')}</h2>
        <div className="space-y-4 mb-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex gap-3 items-start">
              <span
                className={`flex-shrink-0 w-7 h-7 ${designTokens.radius.full} bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold`}
              >
                {n}
              </span>
              <p className={`${textVariants.body.md()} ${ui.text.muted} leading-relaxed`}>
                {t(`welcome.point${n}`)}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className={`w-full ${buttonVariant('primary')} ${designTokens.radius.lg} py-3 text-base font-medium`}
        >
          {t('welcome.gotIt')}
        </button>
      </div>
    </div>
  );
}

function formatPrice(price: number | null, country: CountryCode): string {
  if (price == null) return '';
  return formatPriceShortLib(price, country);
}

function formatPriceFull(price: number | null, country: CountryCode): string {
  if (price == null) return '';
  return formatPriceLib(price, country);
}

/** Property card for the list view */
function PropertyCard({
  property,
  country,
  isFavorited,
  onToggleFavorite,
}: {
  property: Property;
  country: CountryCode;
  isFavorited?: boolean;
  onToggleFavorite?: () => Promise<void>;
}) {
  const { t } = useTranslation('common');
  const statusColors: Record<string, string> = {
    for_sale: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    sold: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    delisted: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <div
      className={`relative ${designTokens.radius.lg} border ${ui.border.default} overflow-hidden`}
    >
      <LocalizedLink
        to={`/properties/${property.id}`}
        className={`block hover:bg-theme-hover-bg ${ui.transition.default}`}
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
            <span className={`${ui.text.muted} text-sm`}>{t('property.noImage')}</span>
          </div>
        )}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`${textVariants.heading.h5()} text-base`}>
              {formatPriceFull(property.price, country)}
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
            {property.address.region}
          </p>
          <div className={`flex gap-3 text-xs ${ui.text.muted} mt-1`}>
            {property.bedrooms != null && (
              <span>
                {property.bedrooms} {t('property.beds')}
              </span>
            )}
            {property.bathrooms != null && (
              <span>
                {property.bathrooms} {t('property.baths')}
              </span>
            )}
            {property.sqft != null && (
              <span>
                {property.sqft.toLocaleString()} {t('property.sqft')}
              </span>
            )}
          </div>
        </div>
      </LocalizedLink>
      {onToggleFavorite && (
        <div className="absolute top-2 right-2">
          <FavoriteButton
            isFavorited={isFavorited ?? false}
            onToggle={onToggleFavorite}
            size="sm"
            className="bg-white/80 dark:bg-gray-900/80 rounded-full p-1"
          />
        </div>
      )}
    </div>
  );
}

/** Map marker with info window */
function PropertyMarker({
  property,
  country,
  isSelected,
  onSelect,
}: {
  property: Property;
  country: CountryCode;
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
          {formatPrice(property.price, country)}
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
            className="block text-gray-900 no-underline hover:text-blue-600 pt-2 pr-6"
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
                <p className="font-bold text-sm leading-tight">{formatPriceFull(property.price, country)}</p>
                <p className="text-xs text-gray-600 truncate leading-tight">
                  {property.address.street}
                  {property.address.unit ? `, ${property.address.unit}` : ''}
                </p>
                <p className="text-xs text-gray-600 leading-tight">
                  {property.address.city}, {property.address.region} {property.address.postal_code}
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

/** Search form with controlled Radix Selects and advanced filter popover.
 *  Rendered with key={urlKey} so it remounts when URL changes, resetting draft state. */
function SearchForm({
  initialQuery,
  initialMinPrice,
  initialMaxPrice,
  initialBedrooms,
  initialRecentlySold,
  initialWithOffers,
  locatingUser,
  country,
  onCountryChange,
  onSearch,
  onCurrentLocation,
}: {
  initialQuery: string;
  initialMinPrice: string;
  initialMaxPrice: string;
  initialBedrooms: string;
  initialRecentlySold: boolean;
  initialWithOffers: boolean;
  locatingUser: boolean;
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  onSearch: (params: Record<string, string>) => void;
  onCurrentLocation: () => void;
}) {
  const { t } = useTranslation('common');
  const [draftMinPrice, setDraftMinPrice] = useState(initialMinPrice || 'any');
  const [draftMaxPrice, setDraftMaxPrice] = useState(initialMaxPrice || 'any');
  const [draftBedrooms, setDraftBedrooms] = useState(initialBedrooms || 'any');
  const [draftRecentlySold, setDraftRecentlySold] = useState(initialRecentlySold);
  const [draftWithOffers, setDraftWithOffers] = useState(initialWithOffers);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);

  // Close advanced dropdown on outside click
  useEffect(() => {
    if (!showAdvanced) return;
    const handler = (e: MouseEvent) => {
      if (advancedRef.current && !advancedRef.current.contains(e.target as Node)) {
        setShowAdvanced(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAdvanced]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = (fd.get('q') as string)?.trim();

    if (draftRecentlySold || draftWithOffers) {
      const params: Record<string, string> = {};
      if (draftRecentlySold) params.recently_sold = '1';
      if (draftWithOffers) params.with_offers = '1';
      if (q) params.q = q;
      onSearch(params);
      return;
    }

    if (!q) return;
    const params: Record<string, string> = { q };
    if (draftMinPrice !== 'any') params.min_price = draftMinPrice;
    if (draftMaxPrice !== 'any') params.max_price = draftMaxPrice;
    if (draftBedrooms !== 'any') params.min_bedrooms = draftBedrooms;
    onSearch(params);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex-1 flex gap-2">
          <select
            value={country}
            onChange={e => onCountryChange(e.target.value as CountryCode)}
            className={`h-10 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary px-2 py-2 text-sm flex-shrink-0`}
          >
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <input
            name="q"
            type="text"
            defaultValue={initialQuery}
            placeholder={t('search.placeholder')}
            className={`flex-1 h-10 px-4 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm`}
          />
          <button
            type="button"
            onClick={onCurrentLocation}
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
          <Select value={draftMinPrice} onValueChange={setDraftMinPrice}>
            <SelectTrigger className="h-10 w-28 text-sm">
              <SelectValue placeholder={t('search.minPrice')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('search.minPrice')}</SelectItem>
              <SelectItem value="100000">$100K</SelectItem>
              <SelectItem value="200000">$200K</SelectItem>
              <SelectItem value="300000">$300K</SelectItem>
              <SelectItem value="500000">$500K</SelectItem>
              <SelectItem value="750000">$750K</SelectItem>
              <SelectItem value="1000000">$1M</SelectItem>
              <SelectItem value="2000000">$2M</SelectItem>
              <SelectItem value="5000000">$5M</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draftMaxPrice} onValueChange={setDraftMaxPrice}>
            <SelectTrigger className="h-10 w-28 text-sm">
              <SelectValue placeholder={t('search.maxPrice')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('search.maxPrice')}</SelectItem>
              <SelectItem value="200000">$200K</SelectItem>
              <SelectItem value="300000">$300K</SelectItem>
              <SelectItem value="500000">$500K</SelectItem>
              <SelectItem value="750000">$750K</SelectItem>
              <SelectItem value="1000000">$1M</SelectItem>
              <SelectItem value="2000000">$2M</SelectItem>
              <SelectItem value="5000000">$5M</SelectItem>
              <SelectItem value="10000000">$10M</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draftBedrooms} onValueChange={setDraftBedrooms}>
            <SelectTrigger className="h-10 w-24 text-sm">
              <SelectValue placeholder={t('search.beds')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('search.beds')}</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative" ref={advancedRef}>
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className={`h-10 w-10 ${designTokens.radius.lg} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary text-sm hover:bg-theme-hover-bg ${ui.transition.default} flex-shrink-0 flex items-center justify-center ${
                draftRecentlySold || draftWithOffers
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : ''
              }`}
              title={t('search.advanced')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {showAdvanced && (
              <div
                className={`absolute right-0 top-full mt-1 ${designTokens.radius.lg} border ${ui.border.default} bg-theme-bg-primary shadow-lg z-50 p-3 space-y-3 min-w-[200px]`}
              >
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm">{t('search.recentlySold')}</span>
                  <Switch checked={draftRecentlySold} onCheckedChange={setDraftRecentlySold} />
                </label>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm">{t('search.withOffers')}</span>
                  <Switch checked={draftWithOffers} onCheckedChange={setDraftWithOffers} />
                </label>
              </div>
            )}
          </div>
          <button
            type="submit"
            className={`h-10 ${buttonVariant('primary')} ${designTokens.radius.lg} text-sm px-5`}
          >
            {t('search.button')}
          </button>
        </div>
      </div>
    </form>
  );
}

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
  const recentlySold = urlParams.get('recently_sold') === '1';
  const withOffers = urlParams.get('with_offers') === '1';
  const urlLat = urlParams.get('lat');
  const urlLng = urlParams.get('lng');

  const [country, setCountry] = useState<CountryCode>(getStoredCountry);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(WELCOME_SEEN_KEY));
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(getSearchHistory);

  const handleCountryChange = useCallback(
    (newCountry: CountryCode) => {
      setCountry(newCountry);
      localStorage.setItem(STORAGE_KEY, newCountry);
      setUrlParams({}, { replace: true });
      setSelectedMarkerId(null);
    },
    [setUrlParams]
  );

  const countryOption = COUNTRY_OPTIONS.find(c => c.code === country)!;

  // Draft filter state is managed inside SearchFilters (keyed by urlKey to reset on URL change)

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
  }, []);

  // Build API search params from URL params
  const searchParams = useMemo(() => {
    const params: Record<string, string> = { country };
    if (withOffers) {
      params.has_pretend_offers = 'true';
    } else if (recentlySold) {
      params.status = 'sold';
      params.sold_within_months = '3';
    } else {
      if (urlLat && urlLng) {
        params.latitude = urlLat;
        params.longitude = urlLng;
      } else if (query) {
        params.query = query;
      }
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (minBedrooms) params.min_bedrooms = minBedrooms;
    }
    return params;
  }, [country, query, urlLat, urlLng, minPrice, maxPrice, minBedrooms, recentlySold, withOffers]);

  const hasSearched = !!(query || (urlLat && urlLng) || recentlySold || withOffers);

  const { data, isLoading, error } = usePropertySearch(networkClient, baseUrl, searchParams, {
    enabled: hasSearched,
  });

  const handleSearch = useCallback(
    (params: Record<string, string>) => {
      if (showWelcome) dismissWelcome();
      const q = params.q;
      if (q && !params.recently_sold && !params.with_offers) {
        analyticsService.trackButtonClick('search_properties', { query: q });
        saveSearchToHistory(q, params);
        setSearchHistory(getSearchHistory());
      }
      setUrlParams(params, { replace: false });
      setSelectedMarkerId(null);
    },
    [setUrlParams, showWelcome, dismissWelcome]
  );

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocatingUser(true);
    if (showWelcome) dismissWelcome();
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        analyticsService.trackButtonClick('current_location', { latitude, longitude });
        const params: Record<string, string> = {
          q: t('search.nearMe'),
          lat: String(latitude),
          lng: String(longitude),
        };
        setUrlParams(params, { replace: false });
        setSelectedMarkerId(null);
        setLocatingUser(false);
        saveSearchToHistory(t('search.nearMe'), params);
        setSearchHistory(getSearchHistory());
      },
      () => {
        setLocatingUser(false);
      }
    );
  }, [t, setUrlParams, showWelcome, dismissWelcome]);

  const handleHistoryClick = useCallback(
    (entry: SearchHistoryEntry) => {
      if (showWelcome) dismissWelcome();
      setUrlParams(entry.params, { replace: false });
      setSelectedMarkerId(null);
    },
    [setUrlParams, showWelcome, dismissWelcome]
  );

  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const properties = data?.properties ?? EMPTY_PROPERTIES;
  const hasResults = hasSearched && properties.length > 0;

  // Favorites
  const { user } = useAuthStatus();
  const { token } = useApi();
  const queryClient = useQueryClient();
  const authHeaders = useMemo(
    (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const propertyIds = useMemo(() => properties.map(p => p.id), [properties]);
  const idsKey = propertyIds.join(',');

  const { data: favCheckData } = useQuery({
    queryKey: ['mogulgame', 'favorites', 'check', idsKey],
    queryFn: async () => {
      const response = await networkClient.get(
        `${baseUrl}/api/v1/favorites/check?property_ids=${idsKey}`,
        { headers: authHeaders }
      );
      const body = response.data as {
        success: boolean;
        data?: { favorites: Record<string, boolean> };
      };
      if (!body.success || !body.data) return {};
      return body.data.favorites;
    },
    enabled: !!user && !!token && propertyIds.length > 0,
    staleTime: 60_000,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({
      propertyId,
      isFavorited,
    }: {
      propertyId: string;
      isFavorited: boolean;
    }) => {
      if (isFavorited) {
        return networkClient.delete(`${baseUrl}/api/v1/favorites/${propertyId}`, {
          headers: authHeaders,
        });
      }
      return networkClient.post(
        `${baseUrl}/api/v1/favorites/${propertyId}`,
        {},
        { headers: authHeaders }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mogulgame', 'favorites'] });
    },
  });

  const handleToggleFavorite = useCallback(
    async (propertyId: string) => {
      const isFavorited = favCheckData?.[propertyId] ?? false;
      await favoriteMutation.mutateAsync({ propertyId, isFavorited });
    },
    [favCheckData, favoriteMutation]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SEOHead title={t('seo.home.title')} description={t('seo.home.description')} />

      {/* Search bar */}
      <div className={`border-b ${ui.border.default} bg-theme-bg-primary`}>
        <SearchForm
          key={urlKey}
          initialQuery={query}
          initialMinPrice={minPrice}
          initialMaxPrice={maxPrice}
          initialBedrooms={minBedrooms}
          initialRecentlySold={recentlySold}
          initialWithOffers={withOffers}
          locatingUser={locatingUser}
          country={country}
          onCountryChange={handleCountryChange}
          onSearch={handleSearch}
          onCurrentLocation={handleCurrentLocation}
        />
      </div>

      {/* Search history chips (show when no active search) */}
      {!hasSearched && searchHistory.length > 0 && (
        <div className={`border-b ${ui.border.default} bg-theme-bg-primary`}>
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${ui.text.muted} flex-shrink-0`}>
                {t('search.recentSearches')}
              </span>
              <div className="flex gap-1.5 overflow-x-auto min-w-0">
                {searchHistory.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => handleHistoryClick(entry)}
                    className={`px-3 py-1 ${designTokens.radius.full} text-xs border ${ui.border.default} ${ui.text.muted} hover:bg-theme-hover-bg ${ui.transition.default} whitespace-nowrap flex-shrink-0`}
                  >
                    {entry.query}
                  </button>
                ))}
              </div>
              <button
                onClick={handleClearHistory}
                className={`text-xs ${ui.text.muted} hover:${ui.text.error} ${ui.transition.default} flex-shrink-0`}
              >
                {t('search.clearHistory')}
              </button>
            </div>
          </div>
        </div>
      )}

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
      <Section spacing="none" className="flex-1 min-h-0 relative" containerClassName="h-full">
        {/* Welcome overlay */}
        {showWelcome && !hasSearched && <WelcomeOverlay onDismiss={dismissWelcome} />}

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
                defaultCenter={countryOption.center}
                defaultZoom={countryOption.zoom}
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
                    country={country}
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
                    <PropertyCard
                      key={p.id}
                      property={p}
                      country={country}
                      isFavorited={favCheckData?.[p.id] ?? false}
                      onToggleFavorite={() => handleToggleFavorite(p.id)}
                    />
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
                  <PropertyCard
                    key={p.id}
                    property={p}
                    country={country}
                    isFavorited={favCheckData?.[p.id] ?? false}
                    onToggleFavorite={() => handleToggleFavorite(p.id)}
                  />
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
      </Section>
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
