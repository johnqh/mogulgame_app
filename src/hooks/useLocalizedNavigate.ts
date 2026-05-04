import { useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

/**
 * Hook that wraps React Router's `useNavigate` to automatically prepend
 * the current language prefix to every navigation path. Also provides
 * a `switchLanguage` helper for changing the active locale while
 * staying on the same page.
 */
export function useLocalizedNavigate() {
  const routerNavigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();
  const currentLanguage = lang || 'en';

  const navigate = useCallback(
    (path: string) => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      routerNavigate(`/${currentLanguage}${cleanPath}`);
    },
    [routerNavigate, currentLanguage]
  );

  const switchLanguage = useCallback(
    (newLang: string) => {
      // Replace the current language prefix with the new one
      const pathWithoutLang = location.pathname.replace(/^\/[a-z]{2}(-[a-z]+)?\/?/, '/');
      routerNavigate(`/${newLang}${pathWithoutLang}`);
    },
    [routerNavigate, location.pathname]
  );

  return useMemo(
    () => ({ navigate, switchLanguage, currentLanguage }),
    [navigate, switchLanguage, currentLanguage]
  );
}
