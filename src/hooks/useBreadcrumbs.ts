import { useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BreadcrumbBuilder } from '../utils/BreadcrumbBuilder';

export const useBreadcrumbs = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const breadcrumbBuilder = BreadcrumbBuilder.getInstance();

  const dynamicTitleVersion = useSyncExternalStore(
    callback => breadcrumbBuilder.subscribe(callback),
    () => breadcrumbBuilder.getVersion(),
    () => breadcrumbBuilder.getVersion()
  );

  const breadcrumbItems = useMemo(() => {
    return breadcrumbBuilder.getLocalizedBreadcrumbItems(location.pathname, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breadcrumbBuilder, location.pathname, t, i18n.language, dynamicTitleVersion]);

  const breadcrumbPaths = useMemo(() => {
    return breadcrumbBuilder.localizedBreadcrumbs(location.pathname, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breadcrumbBuilder, location.pathname, t, i18n.language, dynamicTitleVersion]);

  const currentTitle = useMemo(() => {
    return breadcrumbBuilder.localizedBreadcrumb(location.pathname, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breadcrumbBuilder, location.pathname, t, i18n.language, dynamicTitleVersion]);

  return {
    items: breadcrumbItems,
    paths: breadcrumbPaths,
    currentTitle,
  };
};
