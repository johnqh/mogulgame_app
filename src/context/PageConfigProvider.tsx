import { useState, useCallback, type ReactNode } from 'react';
import { PageConfigContext, DEFAULT_PAGE_CONFIG, type PageConfig } from '../hooks/usePageConfig';

export function PageConfigProvider({ children }: { children: ReactNode }) {
  const [pageConfig, setPageConfigState] = useState<PageConfig>(DEFAULT_PAGE_CONFIG);

  const setPageConfig = useCallback((config: PageConfig) => {
    setPageConfigState({ ...DEFAULT_PAGE_CONFIG, ...config });
  }, []);

  const resetPageConfig = useCallback(() => {
    setPageConfigState(DEFAULT_PAGE_CONFIG);
  }, []);

  return (
    <PageConfigContext.Provider value={{ pageConfig, setPageConfig, resetPageConfig }}>
      {children}
    </PageConfigContext.Provider>
  );
}
