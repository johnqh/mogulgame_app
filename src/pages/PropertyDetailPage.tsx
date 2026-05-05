import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStatus } from '@sudobility/auth-components';
import { useApi } from '@sudobility/building_blocks/firebase';
import {
  useProperty,
  usePropertyHistory,
  useOffers,
  useUserProfile,
} from '@sudobility/mogulgame_client';
import { validateOfferPrice, calculateMaxOffer } from '@sudobility/mogulgame_lib';
import { Section } from '@sudobility/components';
import {
  textVariants,
  buttonVariant,
  designTokens,
  ui,
  variants,
  colors,
} from '@sudobility/design';
import type { PriceHistoryEntry } from '@sudobility/mogulgame_types';
import LocalizedLink from '../components/layout/LocalizedLink';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { formatDateTime } from '../utils/formatDateTime';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

function formatPrice(price: number | null): string {
  if (price == null) return 'N/A';
  return `$${price.toLocaleString()}`;
}

const EVENT_COLORS: Record<string, string> = {
  listed: 'text-green-600 dark:text-green-400',
  price_change: 'text-blue-600 dark:text-blue-400',
  pending: 'text-yellow-600 dark:text-yellow-400',
  sold: 'text-red-600 dark:text-red-400',
  delisted: 'text-gray-600 dark:text-gray-400',
  relisted: 'text-purple-600 dark:text-purple-400',
};

function PriceHistoryRow({ entry, locale }: { entry: PriceHistoryEntry; locale: string }) {
  return (
    <div
      className={`flex justify-between items-center py-2 border-b ${ui.border.default} last:border-0`}
    >
      <div>
        <span className={`text-sm font-medium ${EVENT_COLORS[entry.event] ?? ''}`}>
          {entry.event.replace('_', ' ')}
        </span>
        <span className={`${textVariants.body.sm()} ${ui.text.muted} ml-2`}>
          {formatDateTime(entry.date, locale)}
        </span>
      </div>
      <span className={textVariants.body.sm()}>{formatPrice(entry.price)}</span>
    </div>
  );
}

/** Photo carousel with prev/next navigation */
function PhotoCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-64 md:h-96 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <span className={`${ui.text.muted}`}>No photos available</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 md:h-96 bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <img
        src={images[current]}
        alt={`${alt} - photo ${current + 1}`}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          {/* Prev/Next */}
          <button
            onClick={() => setCurrent(i => (i === 0 ? images.length - 1 : i - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          <button
            onClick={() => setCurrent(i => (i === images.length - 1 ? 0 : i + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Next photo"
          >
            &#8250;
          </button>
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.slice(0, 10).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
            {images.length > 10 && (
              <span className="text-white/70 text-xs ml-1">+{images.length - 10}</span>
            )}
          </div>
          {/* Counter */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs">
            {current + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStatus();
  const { networkClient, baseUrl, token } = useApi();
  const { navigate } = useLocalizedNavigate();

  const { property, isLoading, error } = useProperty(networkClient, baseUrl, propertyId ?? null);
  const { data: historyData } = usePropertyHistory(networkClient, baseUrl, propertyId ?? null);
  const {
    offers,
    createOffer,
    isCreating,
    error: offersError,
  } = useOffers(networkClient, baseUrl, token ?? null, { enabled: !!user });
  const { profile } = useUserProfile(networkClient, baseUrl, token ?? null, { enabled: !!user });

  const [offerPrice, setOfferPrice] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    analyticsService.trackPageView(`/properties/${propertyId}`, 'PropertyDetail');
  }, [propertyId]);

  const existingOffer = offers.find(o => o.property_id === propertyId && o.status === 'active');

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const price = Number(offerPrice);
    if (!propertyId || Number.isNaN(price) || price <= 0) {
      setSubmitError(t('offers.invalidPrice'));
      return;
    }

    if (profile) {
      const validationError = validateOfferPrice(price, profile.pretend_usd_balance);
      if (validationError) {
        setSubmitError(validationError);
        return;
      }
    }

    try {
      analyticsService.trackButtonClick('place_offer', { propertyId, offerPrice: price });
      await createOffer({ property_id: propertyId, offer_price: price });
      analyticsService.trackEvent('offer_placed');
      setOfferPrice('');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('offers.createFailed');
      analyticsService.trackError(message, 'create_offer_error');
      setSubmitError(message);
    }
  };

  if (isLoading) {
    return (
      <Section spacing="xl">
        <div className="text-center">
          <div
            role="status"
            aria-label="Loading property"
            className={`${variants.loading.spinner.default()} mx-auto`}
          />
        </div>
      </Section>
    );
  }

  if (error || !property) {
    return (
      <Section spacing="xl">
        <div className="text-center">
          <p className={textVariants.body.md()}>{error ?? t('property.notFound')}</p>
          <button
            onClick={() => navigate('/')}
            className={`mt-4 ${buttonVariant('outline')} ${designTokens.radius.lg} text-sm`}
          >
            {t('common.back')}
          </button>
        </div>
      </Section>
    );
  }

  const maxOffer = profile ? calculateMaxOffer(profile.pretend_usd_balance) : 0;

  return (
    <div className="flex flex-col min-h-0">
      {/* Photo Carousel */}
      <PhotoCarousel images={property.images} alt={property.normalized_address} />

      <SEOHead title={property.normalized_address} description="" noIndex />

      {/* Content */}
      <div className="max-w-4xl mx-auto w-full px-4 py-6 pb-32">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className={`mb-4 ${textVariants.body.sm()} ${ui.text.info} hover:underline`}
        >
          &larr; {t('property.backToSearch')}
        </button>

        {/* Address & price */}
        <div className="mb-6">
          <h1 className={`${textVariants.heading.h2()} mb-1`}>{formatPrice(property.price)}</h1>
          <p className={`${textVariants.body.lg()} ${ui.text.muted}`}>
            {property.address.street}
            {property.address.unit ? `, ${property.address.unit}` : ''}
          </p>
          <p className={`${textVariants.body.md()} ${ui.text.muted}`}>
            {property.address.city}, {property.address.state} {property.address.zip}
          </p>
        </div>

        {/* Key stats */}
        <div className={`flex gap-8 mb-6 pb-6 border-b ${ui.border.default}`}>
          {property.bedrooms != null && (
            <div>
              <p className={textVariants.heading.h4()}>{property.bedrooms}</p>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.beds')}
              </p>
            </div>
          )}
          {property.bathrooms != null && (
            <div>
              <p className={textVariants.heading.h4()}>{property.bathrooms}</p>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.baths')}
              </p>
            </div>
          )}
          {property.sqft != null && (
            <div>
              <p className={textVariants.heading.h4()}>{property.sqft.toLocaleString()}</p>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.sqft')}
              </p>
            </div>
          )}
          {property.lot_size != null && (
            <div>
              <p className={textVariants.heading.h4()}>{property.lot_size.toLocaleString()}</p>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.lotSize')}
              </p>
            </div>
          )}
          {property.property_type && (
            <div>
              <p className={textVariants.heading.h4()}>{property.property_type}</p>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.type')}
              </p>
            </div>
          )}
        </div>

        {/* Status & source */}
        <div className={`flex gap-6 mb-6 pb-6 border-b ${ui.border.default}`}>
          <div>
            <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
              {t('property.status')}
            </p>
            <p className={`${textVariants.body.md()} font-medium capitalize`}>
              {property.listing_status.replace('_', ' ')}
            </p>
          </div>
          {property.source && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.source')}
              </p>
              <p className={`${textVariants.body.md()} font-medium capitalize`}>
                {property.source}
              </p>
            </div>
          )}
          {property.zestimate != null && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.zestimate')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>
                {formatPrice(property.zestimate)}
              </p>
            </div>
          )}
          {property.sold_price != null && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.soldPrice')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>
                {formatPrice(property.sold_price)}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {property.description && (
          <div className={`mb-6 pb-6 border-b ${ui.border.default}`}>
            <h3 className={`${textVariants.heading.h4()} mb-3`}>{t('property.description')}</h3>
            <p
              className={`${textVariants.body.sm()} ${ui.text.muted} whitespace-pre-line leading-relaxed`}
            >
              {property.description}
            </p>
          </div>
        )}

        {/* Price History */}
        {historyData && historyData.entries.length > 0 && (
          <div className="mb-6">
            <h3 className={`${textVariants.heading.h4()} mb-3`}>{t('property.priceHistory')}</h3>
            <div
              className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
            >
              {historyData.entries.map((entry, i) => (
                <PriceHistoryRow key={i} entry={entry} locale={i18n.language} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Offer Panel */}
      <div
        className={`sticky bottom-0 border-t ${ui.border.default} bg-theme-bg-primary shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`}
      >
        <div className="max-w-4xl mx-auto w-full px-4 py-3">
          {!user ? (
            <div className="flex items-center justify-between">
              <p className={textVariants.body.sm()}>{t('offers.loginToOffer')}</p>
              <LocalizedLink
                to="/login"
                className={`${buttonVariant('primary')} ${designTokens.radius.lg} text-sm`}
              >
                {t('nav.login')}
              </LocalizedLink>
            </div>
          ) : existingOffer ? (
            <div className="flex items-center justify-between">
              <div>
                <p className={`${textVariants.body.sm()} font-medium`}>
                  {t('offers.yourOffer')}: {formatPrice(existingOffer.offer_price)}
                </p>
                <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                  {t('offers.placedOn')} {formatDateTime(existingOffer.created_at, i18n.language)}
                </p>
              </div>
              <LocalizedLink
                to="/offers"
                className={`${buttonVariant('outline')} ${designTokens.radius.lg} text-sm`}
              >
                {t('offers.manageOffers')}
              </LocalizedLink>
            </div>
          ) : (
            <form onSubmit={handleSubmitOffer} className="flex items-end gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="offer-price" className={textVariants.label.default()}>
                    {t('offers.offerPrice')}
                  </label>
                  {profile && (
                    <span className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                      {t('offers.balance')}: {formatPrice(profile.pretend_usd_balance)} |{' '}
                      {t('offers.maxOffer')}: {formatPrice(maxOffer)}
                    </span>
                  )}
                </div>
                <input
                  id="offer-price"
                  type="number"
                  step="1000"
                  min="1"
                  value={offerPrice}
                  onChange={e => {
                    setOfferPrice(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder={t('offers.pricePlaceholder')}
                  className={`w-full px-3 py-2 ${designTokens.radius.md} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary`}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className={`${buttonVariant('primary')} ${designTokens.radius.lg} text-sm px-6 py-2 ${ui.states.disabled}`}
              >
                {isCreating ? t('common.loading') : t('offers.placeOffer')}
              </button>
            </form>
          )}
          {(submitError ?? offersError) && (
            <div
              role="alert"
              className={`mt-2 p-2 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.md} text-xs`}
            >
              {submitError ?? offersError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
