import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStatus } from '@sudobility/auth-components';
import { useApi } from '@sudobility/building_blocks/firebase';
import { useOffers, useUserProfile } from '@sudobility/mogulgame_client';
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
import type { PretendOffer, PretendOfferStatus } from '@sudobility/mogulgame_types';
import LocalizedLink from '../components/layout/LocalizedLink';
import { formatDateTime } from '../utils/formatDateTime';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

const STATUS_STYLES: Record<PretendOfferStatus, string> = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  expired: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

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

export default function OffersPage() {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStatus();
  const { networkClient, baseUrl, token } = useApi();

  const { offers, isLoading, error, cancelOffer, updateOffer, isCancelling, isUpdating } =
    useOffers(networkClient, baseUrl, token ?? null, { enabled: !!user });
  const { profile } = useUserProfile(networkClient, baseUrl, token ?? null, { enabled: !!user });

  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  return (
    <Section spacing="md">
      <SEOHead title={t('offers.title')} description="" noIndex />
      <h1 className={`${textVariants.heading.h3()} mb-6`}>{t('offers.title')}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      {/* Current Offers */}
      {currentOffers.length > 0 && (
        <div className="mb-8">
          <h2 className={`${textVariants.heading.h4()} mb-3`}>
            {t('offers.currentOffers')} ({currentOffers.length})
          </h2>
          <div className="space-y-3">
            {currentOffers.map(offer => (
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
        </div>
      )}

      {/* Past Offers */}
      {pastOffers.length > 0 && (
        <div>
          <h2 className={`${textVariants.heading.h4()} mb-3`}>
            {t('offers.pastOffers')} ({pastOffers.length})
          </h2>
          <div className="space-y-3">
            {pastOffers.map(offer => (
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
        </div>
      )}
    </Section>
  );
}
