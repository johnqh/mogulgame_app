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
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import {
  textVariants,
  buttonVariant,
  designTokens,
  ui,
  variants,
  colors,
} from '@sudobility/design';
import type { PriceHistoryEntry, PropertyDetail } from '@sudobility/mogulgame_types';
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
  const detail: PropertyDetail | null = property.detail ?? null;

  return (
    <div className="flex flex-col min-h-0">
      {/* Photo Coverflow */}
      <Section spacing="sm" maxWidth="5xl">
        {property.images.length > 0 ? (
          <Swiper
            modules={[EffectCoverflow, Navigation, Pagination]}
            effect="coverflow"
            grabCursor
            centeredSlides
            slidesPerView="auto"
            slideToClickedSlide
            navigation
            pagination={{ clickable: true }}
            coverflowEffect={{
              rotate: 20,
              stretch: '5%',
              depth: 150,
              modifier: 2,
              slideShadows: true,
            }}
            className="w-full"
            style={{ paddingBottom: '40px' }}
          >
            {property.images.slice(0, 20).map((img, i) => (
              <SwiperSlide key={i} style={{ width: '85%', maxWidth: '720px' }}>
                <div className={`${designTokens.radius.lg} overflow-hidden`}>
                  <img
                    src={img}
                    alt={`${property.normalized_address} - ${i + 1}`}
                    className="w-full aspect-[16/10] object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <div className="w-full h-[300px] md:h-[450px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
            <span className={ui.text.muted}>{t('property.noPhotos')}</span>
          </div>
        )}
      </Section>

      <SEOHead title={property.normalized_address} description="" noIndex />

      {/* Content */}
      <Section spacing="md" maxWidth="4xl">
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
          {detail?.neighborhoods && detail.neighborhoods.length > 0 && (
            <p className={`${textVariants.body.sm()} ${ui.text.muted} mt-1`}>
              {detail.neighborhoods.join(', ')}
            </p>
          )}
        </div>

        {/* Key stats */}
        <div
          className={`grid grid-cols-3 sm:grid-cols-6 gap-4 mb-6 pb-6 border-b ${ui.border.default}`}
        >
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
          {detail?.price_per_sqft != null && (
            <div>
              <p className={textVariants.heading.h4()}>${detail.price_per_sqft.toLocaleString()}</p>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.pricePerSqft')}
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
          {detail?.year_built != null && (
            <div>
              <p className={textVariants.heading.h4()}>{detail.year_built}</p>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.yearBuilt')}
              </p>
            </div>
          )}
        </div>

        {/* Property details grid */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b ${ui.border.default}`}
        >
          <div>
            <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
              {t('property.status')}
            </p>
            <p className={`${textVariants.body.md()} font-medium capitalize`}>
              {property.listing_status.replace('_', ' ')}
            </p>
          </div>
          {property.property_type && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.type')}
              </p>
              <p className={`${textVariants.body.md()} font-medium capitalize`}>
                {property.property_type.replace(/_/g, ' ')}
              </p>
            </div>
          )}
          {detail?.stories != null && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.stories')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>{detail.stories}</p>
            </div>
          )}
          {detail?.garage && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.garage')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>{detail.garage}</p>
            </div>
          )}
          {detail?.heating && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.heating')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>{detail.heating}</p>
            </div>
          )}
          {detail?.cooling && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.cooling')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>{detail.cooling}</p>
            </div>
          )}
          {detail?.hoa_fee != null && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.hoaFee')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>
                {formatPrice(detail.hoa_fee)}/mo
              </p>
            </div>
          )}
          {property.listed_at && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.listedOn')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>
                {formatDateTime(property.listed_at, i18n.language)}
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
          {property.sold_at && (
            <div>
              <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                {t('property.soldOn')}
              </p>
              <p className={`${textVariants.body.md()} font-medium`}>
                {formatDateTime(property.sold_at, i18n.language)}
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

        {/* Tax History */}
        {detail?.tax_history && detail.tax_history.length > 0 && (
          <div className={`mb-6 pb-6 border-b ${ui.border.default}`}>
            <h3 className={`${textVariants.heading.h4()} mb-3`}>{t('property.taxHistory')}</h3>
            <div
              className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
            >
              {detail.tax_history.map((tx, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-2 border-b ${ui.border.default} last:border-0`}
                >
                  <span className={textVariants.body.sm()}>{tx.year}</span>
                  <div className="text-right">
                    <span className={textVariants.body.sm()}>{formatPrice(tx.tax)}</span>
                    {tx.assessment_total != null && (
                      <span className={`${textVariants.caption.default()} ${ui.text.muted} ml-2`}>
                        (assessed: {formatPrice(tx.assessment_total)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Property History */}
        {detail?.property_history && detail.property_history.length > 0 && (
          <div className={`mb-6 pb-6 border-b ${ui.border.default}`}>
            <h3 className={`${textVariants.heading.h4()} mb-3`}>{t('property.propertyHistory')}</h3>
            <div
              className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
            >
              {detail.property_history.map((event, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-2 border-b ${ui.border.default} last:border-0`}
                >
                  <div>
                    <span
                      className={`text-sm font-medium ${EVENT_COLORS[event.event_name.toLowerCase()] ?? ''}`}
                    >
                      {event.event_name}
                    </span>
                    <span className={`${textVariants.body.sm()} ${ui.text.muted} ml-2`}>
                      {formatDateTime(event.date, i18n.language)}
                    </span>
                  </div>
                  {event.price != null && (
                    <span className={textVariants.body.sm()}>{formatPrice(event.price)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price History from API */}
        {historyData && historyData.entries.length > 0 && (
          <div className={`mb-6 pb-6 border-b ${ui.border.default}`}>
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

        {/* Schools */}
        {detail?.schools && detail.schools.length > 0 && (
          <div className={`mb-6 pb-6 border-b ${ui.border.default}`}>
            <h3 className={`${textVariants.heading.h4()} mb-3`}>{t('property.nearbySchools')}</h3>
            <div className="space-y-2">
              {detail.schools.map((school, i) => (
                <div
                  key={i}
                  className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default} flex justify-between items-center`}
                >
                  <div>
                    <p className={`${textVariants.body.sm()} font-medium`}>{school.name}</p>
                    <p className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                      {school.funding_type && (
                        <span className="capitalize">{school.funding_type}</span>
                      )}
                      {school.grades.length > 0 &&
                        ` · Grades ${school.grades[0]}-${school.grades[school.grades.length - 1]}`}
                      {school.distance_miles != null && ` · ${school.distance_miles} mi`}
                    </p>
                  </div>
                  {school.rating != null && (
                    <div className="text-center">
                      <p
                        className={`${textVariants.heading.h5()} ${school.rating >= 7 ? 'text-green-600 dark:text-green-400' : school.rating >= 4 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {school.rating}/10
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Sections (structured property features) */}
        {detail?.detail_sections && detail.detail_sections.length > 0 && (
          <div className={`mb-6 pb-6 border-b ${ui.border.default}`}>
            <h3 className={`${textVariants.heading.h4()} mb-3`}>
              {t('property.propertyFeatures')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detail.detail_sections.map((section, i) => (
                <div key={i}>
                  <p className={`${textVariants.body.sm()} font-medium mb-1`}>{section.category}</p>
                  <ul className="space-y-0.5">
                    {section.text.map((item, j) => (
                      <li key={j} className={`${textVariants.caption.default()} ${ui.text.muted}`}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External link */}
        {property.url && (
          <div className="mb-6 pb-24">
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${textVariants.body.sm()} ${ui.text.info} hover:underline`}
            >
              {t('property.viewOnSource', { source: property.source ?? 'Realtor' })} &rarr;
            </a>
          </div>
        )}
      </Section>

      {/* Sticky Offer Panel */}
      <div
        className={`sticky bottom-0 border-t ${ui.border.default} bg-theme-bg-primary shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`}
      >
        <Section spacing="none" maxWidth="4xl">
          <div className="py-3">
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
        </Section>
      </div>
    </div>
  );
}
