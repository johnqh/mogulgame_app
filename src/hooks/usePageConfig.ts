import { createContext, useContext, useLayoutEffect } from 'react';

export interface PageConfig {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full';
  contentPadding?: 'none' | 'sm' | 'md' | 'lg';
  scrollable?: boolean;
  contentClassName?: string;
  mainClassName?: string;
  background?: 'default' | 'white' | 'gradient';
}

export interface PageConfigContextValue {
  pageConfig: PageConfig;
  setPageConfig: (config: PageConfig) => void;
  resetPageConfig: () => void;
}

export const DEFAULT_PAGE_CONFIG: PageConfig = {
  maxWidth: 'full',
  contentPadding: 'none',
  contentClassName: 'w-full min-w-0',
};

export const PageConfigContext = createContext<PageConfigContextValue | null>(null);

export function usePageConfig() {
  const context = useContext(PageConfigContext);
  if (!context) {
    throw new Error('usePageConfig must be used within PageConfigProvider');
  }
  return context;
}

/**
 * Hook for pages to override layout config. Uses useLayoutEffect to set
 * config before paint. Config is automatically reset when the page unmounts.
 */
export function useSetPageConfig(config: PageConfig) {
  const { setPageConfig, resetPageConfig } = usePageConfig();
  const configStr = JSON.stringify(config);

  useLayoutEffect(() => {
    setPageConfig(JSON.parse(configStr));
    return () => resetPageConfig();
  }, [configStr, setPageConfig, resetPageConfig]);
}
