import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStatus } from '@sudobility/auth-components';
import { useApi } from '@sudobility/building_blocks/firebase';
import { useHistoriesManager } from '@sudobility/mogulgame_lib';
import { Section } from '@sudobility/components';
import {
  textVariants,
  buttonVariant,
  designTokens,
  ui,
  variants,
  colors,
} from '@sudobility/design';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { formatDateTime } from '../utils/formatDateTime';
import SEOHead from '../components/SEOHead';
import { analyticsService } from '../config/analytics';

/**
 * Detail view for a single history entry. Shows the datetime, value,
 * and creation timestamp, with the ability to delete the record.
 */
export default function HistoryDetailPage() {
  const { historyId } = useParams<{ historyId: string }>();
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStatus();
  const { networkClient, baseUrl, token } = useApi();
  const { navigate } = useLocalizedNavigate();

  const { histories, deleteHistory, isLoading } = useHistoriesManager({
    baseUrl,
    networkClient,
    userId: user?.uid ?? null,
    token: token ?? null,
  });

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    analyticsService.trackPageView(`/histories/${historyId}`, 'HistoryDetail');
  }, [historyId]);

  const history = histories.find(h => h.id === historyId);

  if (isLoading && !history) {
    return (
      <Section spacing="xl">
        <div className="text-center">
          <div
            role="status"
            aria-label="Loading history detail"
            className={`${variants.loading.spinner.default()} mx-auto`}
          />
        </div>
      </Section>
    );
  }

  if (!history) {
    return (
      <Section spacing="xl">
        <div className="text-center">
          <p className={textVariants.body.md()}>{t('histories.notFound')}</p>
        </div>
      </Section>
    );
  }

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      setIsDeleting(true);
      analyticsService.trackButtonClick('delete_history');
      await deleteHistory(history.id);
      analyticsService.trackEvent('history_deleted');
      navigate('/histories');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete history entry.';
      analyticsService.trackError(message, 'delete_history_error');
      setDeleteError(message);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Section spacing="md" maxWidth="lg">
      <SEOHead title={t('histories.detail')} description="" noIndex />
      <h1 className={`${textVariants.heading.h3()} mb-6`}>{t('histories.detail')}</h1>

      {/* Delete error */}
      {deleteError && (
        <div
          role="alert"
          className={`mb-4 p-3 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.lg} text-sm`}
        >
          {deleteError}
        </div>
      )}

      <div
        className={`${ui.spacing.card.md} ${designTokens.radius.lg} border ${ui.border.default} space-y-4`}
      >
        <div>
          <p className={textVariants.caption.default()}>{t('histories.datetime')}</p>
          <p className={textVariants.body.lg()}>
            {formatDateTime(history.datetime, i18n.language)}
          </p>
        </div>
        <div>
          <p className={textVariants.caption.default()}>{t('histories.value')}</p>
          <p className={textVariants.heading.h3()}>{history.value.toFixed(2)}</p>
        </div>
        {history.created_at && (
          <div>
            <p className={textVariants.caption.default()}>{t('histories.createdAt')}</p>
            <p className={textVariants.body.sm()}>
              {formatDateTime(history.created_at, i18n.language)}
            </p>
          </div>
        )}
      </div>
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => navigate('/histories')}
          className={`${buttonVariant('outline')} ${designTokens.radius.lg} text-sm`}
        >
          {t('common.back')}
        </button>

        {showDeleteConfirm ? (
          <div className="flex gap-2 items-center" role="alert">
            <span className={`text-sm ${ui.text.error}`}>
              {t('common.confirmDelete', 'Are you sure?')}
            </span>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`${buttonVariant('destructive')} ${designTokens.radius.lg} text-sm ${ui.states.disabled}`}
              aria-busy={isDeleting}
            >
              {isDeleting ? t('common.loading', 'Loading...') : t('common.confirm', 'Confirm')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className={`${buttonVariant('outline')} ${designTokens.radius.lg} text-sm`}
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={`${buttonVariant('destructive')} ${designTokens.radius.lg} text-sm`}
          >
            {t('common.delete')}
          </button>
        )}
      </div>
    </Section>
  );
}
