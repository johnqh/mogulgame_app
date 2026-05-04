import { useState, useMemo, useEffect } from 'react';
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
import LocalizedLink from '../components/layout/LocalizedLink';
import { formatDateTime } from '../utils/formatDateTime';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

/**
 * Page displaying the user's history entries with stats, a creation form,
 * and a list of individual history records. Requires authentication.
 */
export default function HistoriesPage() {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStatus();
  const { networkClient, baseUrl, token } = useApi();

  const { histories, total, percentage, isLoading, error, createHistory } = useHistoriesManager({
    baseUrl,
    networkClient,
    userId: user?.uid ?? null,
    token: token ?? null,
  });

  const [showForm, setShowForm] = useState(false);
  const [datetime, setDatetime] = useState('');
  const [value, setValue] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Sum of all user history values, computed once per histories change. */
  const userTotal = useMemo(() => histories.reduce((sum, h) => sum + h.value, 0), [histories]);

  useEffect(() => {
    analyticsService.trackPageView('/histories', 'Histories');
  }, []);

  if (!user) {
    return (
      <Section spacing="xl">
        <div className="text-center">
          <h1 className={`${textVariants.heading.h3()} mb-4`}>{t('histories.title')}</h1>
          <p className={`${textVariants.body.md()} mb-6`}>{t('histories.loginPrompt')}</p>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!datetime || !value) return;

    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      setSubmitError('Value must be a positive number.');
      return;
    }

    const parsedDate = new Date(datetime);
    if (Number.isNaN(parsedDate.getTime())) {
      setSubmitError('Please enter a valid date and time.');
      return;
    }

    try {
      setIsSubmitting(true);
      analyticsService.trackButtonClick('submit_history', { value: numericValue });
      await createHistory({
        datetime: parsedDate.toISOString(),
        value: numericValue,
      });
      analyticsService.trackEvent('history_created');
      setDatetime('');
      setValue('');
      setShowForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create history entry.';
      analyticsService.trackError(message, 'create_history_error');
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Combined error message from the manager hook or local submit error. */
  const displayError = submitError ?? error;

  return (
    <Section spacing="md">
      <SEOHead title={t('histories.title')} description="" noIndex />
      <div className="flex items-center justify-between mb-6">
        <h1 className={textVariants.heading.h3()}>{t('histories.title')}</h1>
        <button
          onClick={() => {
            analyticsService.trackButtonClick(showForm ? 'cancel_add_history' : 'add_history');
            setShowForm(!showForm);
            setSubmitError(null);
          }}
          className={`${buttonVariant('primary')} ${designTokens.radius.lg} text-sm`}
          aria-expanded={showForm}
          aria-controls="history-form"
        >
          {showForm ? t('common.cancel') : t('histories.add')}
        </button>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6"
        role="region"
        aria-label="History statistics"
      >
        <div
          className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
        >
          <p className={textVariants.caption.default()}>{t('histories.yourTotal')}</p>
          <p className={textVariants.heading.h3()}>{userTotal.toFixed(2)}</p>
        </div>
        <div
          className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
        >
          <p className={textVariants.caption.default()}>{t('histories.globalTotal')}</p>
          <p className={textVariants.heading.h3()}>{total.toFixed(2)}</p>
        </div>
        <div
          className={`${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
        >
          <p className={textVariants.caption.default()}>{t('histories.percentage')}</p>
          <p className={`${textVariants.heading.h3()} ${ui.text.info}`}>{percentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form
          id="history-form"
          onSubmit={handleSubmit}
          className={`mb-6 ${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default}`}
          aria-label="Create history entry"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="history-datetime"
                className={`block ${textVariants.label.default()} mb-1`}
              >
                {t('histories.datetime')}
              </label>
              <input
                id="history-datetime"
                type="datetime-local"
                value={datetime}
                onChange={e => setDatetime(e.target.value)}
                className={`w-full px-3 py-2 ${designTokens.radius.md} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary`}
                required
                aria-required="true"
              />
            </div>
            <div>
              <label
                htmlFor="history-value"
                className={`block ${textVariants.label.default()} mb-1`}
              >
                {t('histories.value')}
              </label>
              <input
                id="history-value"
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                className={`w-full px-3 py-2 ${designTokens.radius.md} border ${ui.border.default} ${ui.background.surface} text-theme-text-primary`}
                required
                aria-required="true"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-4 ${buttonVariant('primary')} ${designTokens.radius.lg} text-sm ${ui.states.disabled}`}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? t('common.loading', 'Loading...') : t('histories.create')}
          </button>
        </form>
      )}

      {/* Error */}
      {displayError && (
        <div
          role="alert"
          className={`mb-4 p-3 ${colors.component.alert.error.base} ${colors.component.alert.error.dark} ${designTokens.radius.lg} text-sm`}
        >
          {displayError}
        </div>
      )}

      {/* Loading */}
      {isLoading && histories.length === 0 && (
        <div className="text-center py-8">
          <div
            role="status"
            aria-label="Loading histories"
            className={`${variants.loading.spinner.default()} mx-auto`}
          />
        </div>
      )}

      {/* Histories List */}
      {histories.length === 0 && !isLoading ? (
        <p className={`text-center ${ui.text.muted} py-8`}>{t('histories.empty')}</p>
      ) : (
        <div className="space-y-2" role="list" aria-label="History entries">
          {histories.map(history => (
            <LocalizedLink
              key={history.id}
              to={`/histories/${history.id}`}
              className={`block ${ui.spacing.card.sm} ${designTokens.radius.lg} border ${ui.border.default} hover:bg-theme-hover-bg ${ui.transition.default}`}
              role="listitem"
            >
              <div className="flex justify-between items-center">
                <span className={textVariants.body.sm()}>
                  {formatDateTime(history.datetime, i18n.language)}
                </span>
                <span className={textVariants.heading.h5()}>{history.value.toFixed(2)}</span>
              </div>
            </LocalizedLink>
          ))}
        </div>
      )}
    </Section>
  );
}
