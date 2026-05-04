import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppPageLayout } from '@sudobility/building_blocks';
import { useTopBarConfig } from './TopBar';
import { useFooterConfig } from './Footer';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { PageConfigProvider } from '../../context/PageConfigProvider';
import { usePageConfig } from '../../hooks/usePageConfig';

interface ScreenContainerProps {
  children: ReactNode;
}

/**
 * Page layout shell providing consistent navigation, breadcrumbs, and footer.
 *
 * Wraps all routes at the route level via a layout route. Provides
 * PageConfigProvider so child pages can use useSetPageConfig to override
 * layout properties.
 *
 * Breadcrumbs are hidden on the home page. The footer switches between
 * "full" (home page) and "compact" (all other pages) variants.
 */
export default function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <PageConfigProvider>
      <ScreenContainerInner>{children}</ScreenContainerInner>
    </PageConfigProvider>
  );
}

function ScreenContainerInner({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { items: breadcrumbItems } = useBreadcrumbs();
  const { pageConfig } = usePageConfig();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const isHomePage = pathParts.length <= 1;

  const topBarConfig = useTopBarConfig();
  const footerConfig = useFooterConfig(isHomePage ? 'full' : 'compact');

  return (
    <AppPageLayout
      topBar={topBarConfig}
      breadcrumbs={
        !isHomePage
          ? {
              items: breadcrumbItems,
            }
          : undefined
      }
      footer={footerConfig}
      page={{
        maxWidth: 'full',
        contentPadding: 'none',
        contentClassName: 'w-full min-w-0',
        ...pageConfig,
      }}
    >
      {children}
    </AppPageLayout>
  );
}
