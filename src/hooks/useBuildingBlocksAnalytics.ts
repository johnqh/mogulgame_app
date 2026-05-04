import { useCallback } from 'react';
import { analyticsService } from '../config/analytics';
import type { AnalyticsTrackingParams } from '@sudobility/building_blocks';

export function useBuildingBlocksAnalytics() {
  const onTrack = useCallback((params: AnalyticsTrackingParams) => {
    switch (params.eventType) {
      case 'button_click':
        analyticsService.trackButtonClick(params.label, {
          component_name: params.componentName,
          ...params.params,
        });
        break;
      case 'link_click':
        analyticsService.trackLinkClick(params.label, params.label, {
          component_name: params.componentName,
          ...params.params,
        });
        break;
      case 'settings_change':
        analyticsService.trackButtonClick(params.label, {
          component_name: params.componentName,
          action_type: 'settings_change',
          ...params.params,
        });
        break;
      case 'navigation':
        analyticsService.trackLinkClick(params.label, params.label, {
          component_name: params.componentName,
          navigation_type: 'navigation',
          ...params.params,
        });
        break;
      default:
        analyticsService.trackButtonClick(params.label, {
          component_name: params.componentName,
          action_type: params.eventType,
          ...params.params,
        });
    }
  }, []);

  return onTrack;
}
