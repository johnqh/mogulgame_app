import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SudobilityAppWithFirebaseAuth } from '@sudobility/building_blocks/firebase';
import { LanguageValidator, PerformancePanel } from '@sudobility/components';
import { variants } from '@sudobility/design';
import { isLanguageSupported, CONSTANTS } from './config/constants';
import i18n from './i18n';
import { useDocumentLanguage } from './hooks/useDocumentLanguage';
import { AuthProviderWrapper } from './components/providers/AuthProviderWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import ScreenContainer from './components/layout/ScreenContainer';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const HistoriesPage = lazy(() => import('./pages/HistoriesPage'));
const HistoryDetailPage = lazy(() => import('./pages/HistoryDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const LanguageRedirect = lazy(() => import('./components/layout/LanguageRedirect'));

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
            <Route path="/" element={<LanguageRedirect />} />
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
                <Route index element={<HomePage />} />
                <Route path="docs" element={<DocsPage />} />
                <Route
                  path="histories"
                  element={
                    <ErrorBoundary>
                      <HistoriesPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="histories/:historyId"
                  element={
                    <ErrorBoundary>
                      <HistoryDetailPage />
                    </ErrorBoundary>
                  }
                />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="sitemap" element={<SitemapPage />} />
              </Route>
              <Route path="login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </Route>
            <Route path="*" element={<LanguageRedirect />} />
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
      <AppRoutes />
    </SudobilityAppWithFirebaseAuth>
  );
}

export default App;
