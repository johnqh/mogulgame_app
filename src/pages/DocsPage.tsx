import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MasterDetailLayout } from '@sudobility/components';
import { textVariants, ui, designTokens } from '@sudobility/design';
import { useSetPageConfig } from '../hooks/usePageConfig';
import SEOHead from '../components/SEOHead';
import { analyticsService } from '../config/analytics';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'starter_types', label: 'starter_types' },
  { id: 'starter_api', label: 'starter_api' },
  { id: 'starter_client', label: 'starter_client' },
  { id: 'starter_lib', label: 'starter_lib' },
  { id: 'starter_app', label: 'starter_app' },
  { id: 'starter_app_rn', label: 'starter_app_rn' },
];

const DOCS_CONTENT: Record<string, { title: string; content: string }> = {
  overview: {
    title: 'Overview',
    content:
      'This starter project demonstrates the Sudobility architecture pattern. It consists of 6 interconnected packages that show how to build a full-stack application with shared types, a Hono backend, TanStack Query client hooks, Zustand business logic, a React web app, and a React Native mobile app.',
  },
  starter_types: {
    title: '@sudobility/mogulgame_types',
    content:
      'Shared TypeScript type definitions used by both frontend and backend. Defines User, History, HistoryCreateRequest, HistoryUpdateRequest, and HistoryTotalResponse types. Also includes successResponse() and errorResponse() helper functions for consistent API responses.',
  },
  starter_api: {
    title: 'starter_api',
    content:
      'Hono-based REST API with PostgreSQL + Drizzle ORM. Provides CRUD endpoints for history records under /api/v1/users/:userId/histories (auth required) and a public /api/v1/histories/total endpoint. Uses Firebase Admin SDK for authentication via @sudobility/auth_service.',
  },
  starter_client: {
    title: '@sudobility/mogulgame_client',
    content:
      'Frontend client library with a StarterClient class for HTTP requests and TanStack Query hooks (useHistories, useHistoriesTotal, useHistoryMutations) for automatic caching and cache invalidation. Uses the NetworkClient dependency injection pattern from @sudobility/types.',
  },
  starter_lib: {
    title: '@sudobility/mogulgame_lib',
    content:
      "Business logic library with a Zustand store (useHistoriesStore) for offline cache and a manager hook (useHistoriesManager) that wraps the client hooks. Calculates the user's percentage contribution (userSum / total * 100) and provides a unified interface for CRUD operations.",
  },
  starter_app: {
    title: 'starter_app',
    content:
      'React 19 web application built with Vite and Tailwind CSS. Features i18n support for 16 languages, Firebase authentication, and pages for browsing histories, documentation, and settings. Uses @sudobility/building_blocks for the top bar, login, and settings components.',
  },
  starter_app_rn: {
    title: 'starter_app_rn',
    content:
      'React Native mobile application built with Expo. Features bottom tab navigation with Histories and Settings tabs, Firebase authentication via the JS SDK, and theme switching. Uses the same starter_client and starter_lib packages as the web app.',
  },
};

/**
 * Documentation page with a sidebar navigation showing information
 * about each package in the Starter project ecosystem.
 */
export default function DocsPage() {
  const { t } = useTranslation('common');
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileView, setMobileView] = useState<'navigation' | 'content'>('navigation');

  useSetPageConfig({ scrollable: false, contentPadding: 'sm', maxWidth: '7xl' });

  useEffect(() => {
    analyticsService.trackPageView('/docs', 'Docs');
  }, []);

  const doc = DOCS_CONTENT[activeSection] || DOCS_CONTENT.overview;

  const masterContent = (
    <ul className="space-y-1" role="tablist" aria-orientation="vertical">
      {SECTIONS.map(section => (
        <li key={section.id} role="presentation">
          <button
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls="docs-content"
            onClick={() => {
              analyticsService.trackButtonClick('docs_section', { section: section.id });
              setActiveSection(section.id);
              setMobileView('content');
            }}
            className={`w-full text-left px-3 py-2 ${designTokens.radius.md} text-sm ${ui.transition.default} ${
              activeSection === section.id
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                : 'text-theme-text-secondary hover:bg-theme-hover-bg'
            }`}
          >
            {section.label}
          </button>
        </li>
      ))}
    </ul>
  );

  const detailContent = (
    <div id="docs-content" role="tabpanel" aria-label={doc.title}>
      <h2 className={`${textVariants.heading.h3()} mb-4`}>{doc.title}</h2>
      <p className={`${textVariants.body.md()} leading-relaxed`}>{doc.content}</p>
    </div>
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden flex-1 flex flex-col min-h-0">
      <SEOHead
        title={t('seo.docs.title')}
        description={t('seo.docs.description')}
        ogType="article"
      />
      <MasterDetailLayout
        masterTitle={t('docs.title')}
        masterContent={masterContent}
        detailContent={detailContent}
        detailTitle={doc.title}
        mobileView={mobileView}
        onBackToNavigation={() => setMobileView('navigation')}
        masterWidth={220}
        stickyMaster
      />
    </div>
  );
}
