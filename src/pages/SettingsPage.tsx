import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalSettingsPage } from '@sudobility/building_blocks';
import { useTheme } from '@sudobility/components';
import { useSetPageConfig } from '../hooks/usePageConfig';
import SEOHead from '../components/SEOHead';
import { analyticsService } from '../config/analytics';
import { useBuildingBlocksAnalytics } from '../hooks/useBuildingBlocksAnalytics';

/** User settings page for theme and font size preferences. */
export default function SettingsPage() {
  const { t } = useTranslation('common');
  const { theme, fontSize, setTheme, setFontSize } = useTheme();
  const onTrack = useBuildingBlocksAnalytics();

  useSetPageConfig({ scrollable: false, contentPadding: 'sm', maxWidth: '7xl' });

  useEffect(() => {
    analyticsService.trackPageView('/settings', 'Settings');
  }, []);

  return (
    <>
      <SEOHead title={t('nav.settings')} description="" noIndex />
      <GlobalSettingsPage
        theme={theme}
        fontSize={fontSize}
        onThemeChange={setTheme}
        onFontSizeChange={setFontSize}
        onTrack={onTrack}
      />
    </>
  );
}
