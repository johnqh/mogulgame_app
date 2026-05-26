import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SudobilityAppWithFirebaseAuth } from '@sudobility/building_blocks/firebase';
import { LanguageValidator, LanguageRedirect, PerformancePanel } from '@sudobility/components';
import { variants } from '@sudobility/design';
import { SEOHeadProvider } from '@sudobility/seo_lib';
import { isLanguageSupported, CONSTANTS } from './config/constants';
import { seoHeadConfig } from './config/seo';
import i18n from './i18n';
import { useDocumentLanguage } from './hooks/useDocumentLanguage';
import { AuthProviderWrapper } from './components/providers/AuthProviderWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import ScreenContainer from './components/layout/ScreenContainer';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const HowToPlayPage = lazy(() => import('./pages/HowToPlayPage'));
const WhyPlayPage = lazy(() => import('./pages/WhyPlayPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const OffersPage = lazy(() => import('./pages/OffersPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MyFavoritesPage = lazy(() => import('./pages/MyFavoritesPage'));
const PopularPage = lazy(() => import('./pages/PopularPage'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const RecentSearchesPage = lazy(() => import('./pages/RecentSearchesPage'));
const MySearchesPage = lazy(() => import('./pages/MySearchesPage'));

/**
 * Full-screen loading spinner displayed while lazy-loaded route
 * components are being fetched.
 */
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-theme-bg-primary">
    <div role="status" aria-label="Loading" className={variants.loading.spinner.default()} />
  </div>
);

function DocumentLanguageSync({ children }: { children: ReactNode }) {
  useDocumentLanguage();
  return <>{children}</>;
}

/**
 * Route-level layout wrapping all pages in ScreenContainer.
 * ScreenContainer provides PageConfigProvider so child pages
 * can use useSetPageConfig for layout overrides.
 */
function ScreenContainerLayout() {
  return (
    <ScreenContainer>
      <Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </Suspense>
    </ScreenContainer>
  );
}

// Stable reference to prevent infinite re-renders
const PERFORMANCE_API_PATTERNS = ['/api/'];

function PerformancePanelComponent() {
  if (import.meta.env.VITE_SHOW_PERFORMANCE_MONITOR !== 'true') {
    return null;
  }
  return (
    <PerformancePanel
      enabled={true}
      position="bottom-right"
      apiPatterns={PERFORMANCE_API_PATTERNS}
    />
  );
}

function AppRoutes() {
  return (
    <DocumentLanguageSync>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path="/"
              element={<LanguageRedirect isLanguageSupported={isLanguageSupported} />}
            />
            <Route
              path="/:lang"
              element={
                <LanguageValidator
                  isLanguageSupported={isLanguageSupported}
                  defaultLanguage="en"
                  storageKey="language"
                />
              }
            >
              <Route element={<ScreenContainerLayout />}>
                <Route
                  index
                  element={
                    <ErrorBoundary>
                      <HomePage />
                    </ErrorBoundary>
                  }
                />
                <Route path="how-to-play" element={<HowToPlayPage />} />
                <Route path="why-play" element={<WhyPlayPage />} />
                <Route
                  path="properties/:propertyId"
                  element={
                    <ErrorBoundary>
                      <PropertyDetailPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="offers"
                  element={
                    <ErrorBoundary>
                      <OffersPage />
                    </ErrorBoundary>
                  }
                />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="popular" element={<PopularPage />} />
                <Route path="recent-searches" element={<RecentSearchesPage />} />
                <Route path="my-searches" element={<MySearchesPage />} />
                <Route path="my-favorites" element={<MyFavoritesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="sitemap" element={<SitemapPage />} />
              </Route>
              <Route path="login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </Route>
            <Route
              path="*"
              element={<LanguageRedirect isLanguageSupported={isLanguageSupported} />}
            />
          </Routes>
          <PerformancePanelComponent />
        </Suspense>
      </ErrorBoundary>
    </DocumentLanguageSync>
  );
}

function App() {
  return (
    <SudobilityAppWithFirebaseAuth
      i18n={i18n}
      baseUrl={CONSTANTS.API_URL}
      testMode={CONSTANTS.DEV_MODE}
      AuthProviderWrapper={AuthProviderWrapper}
    >
      <SEOHeadProvider config={seoHeadConfig}>
        <AppRoutes />
      </SEOHeadProvider>
    </SudobilityAppWithFirebaseAuth>
  );
}

export default App;
