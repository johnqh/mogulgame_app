import { getAnalyticsService, type AnalyticsEventParams } from '@sudobility/di_web';

export type { AnalyticsEventParams };

export const analyticsService = {
  trackEvent(eventName: string, params?: AnalyticsEventParams): void {
    try {
      getAnalyticsService().trackEvent(eventName, params);
    } catch {
      // Analytics not initialized
    }
  },
  trackPageView(pagePath: string, pageTitle?: string): void {
    try {
      getAnalyticsService().trackPageView(pagePath, pageTitle);
    } catch {
      // Analytics not initialized
    }
  },
  trackButtonClick(buttonName: string, params?: AnalyticsEventParams): void {
    try {
      getAnalyticsService().trackButtonClick(buttonName, params);
    } catch {
      // Analytics not initialized
    }
  },
  trackLinkClick(linkUrl: string, linkText?: string, params?: AnalyticsEventParams): void {
    try {
      getAnalyticsService().trackLinkClick(linkUrl, linkText, params);
    } catch {
      // Analytics not initialized
    }
  },
  trackError(errorMessage: string, errorCode?: string): void {
    try {
      getAnalyticsService().trackError(errorMessage, errorCode);
    } catch {
      // Analytics not initialized
    }
  },
};
