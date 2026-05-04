import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@sudobility/auth-components';
import {
  getFirebaseAuth,
  getFirebaseErrorMessage,
  initializeFirebaseAuth,
} from '@sudobility/auth_lib';
import { createAuthTexts, createAuthErrorTexts } from '../../config/auth-config';

interface AuthProviderWrapperProps {
  children: ReactNode;
}

/**
 * Initialises Firebase Auth and wraps children in the shared `AuthProvider`
 * with localised text labels and error messages. Falls through gracefully
 * when Firebase is not configured (e.g. during local development without keys).
 */
export function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  const { t } = useTranslation(['auth', 'common']);

  initializeFirebaseAuth();

  const texts = useMemo(() => createAuthTexts(t), [t]);
  const errorTexts = useMemo(() => createAuthErrorTexts(), []);

  const auth = getFirebaseAuth();

  if (!auth) {
    console.warn('[AuthProviderWrapper] No auth instance - Firebase not configured');
    return <>{children}</>;
  }

  return (
    <AuthProvider
      firebaseConfig={{ type: 'instance', auth: auth }}
      providerConfig={{
        providers: ['google', 'email'],
        enableAnonymous: false,
      }}
      texts={texts}
      errorTexts={errorTexts}
      resolveErrorMessage={getFirebaseErrorMessage}
    >
      {children}
    </AuthProvider>
  );
}
