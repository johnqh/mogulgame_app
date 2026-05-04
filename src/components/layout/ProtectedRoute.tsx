import type { ReactNode } from 'react';
import { ProtectedRoute as SharedProtectedRoute } from '@sudobility/components';
import { useAuthStatus } from '@sudobility/auth-components';

interface ProtectedRouteProps {
  /** Content that should only be visible to authenticated users. */
  children: ReactNode;
}

/**
 * Auth guard that wraps child content and only renders it when the user
 * is authenticated. Shows a loading state while auth status is being
 * determined, then redirects unauthenticated users.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthStatus();

  return (
    <SharedProtectedRoute isAuthenticated={!!user} isLoading={loading} redirectPath="">
      {children}
    </SharedProtectedRoute>
  );
}
