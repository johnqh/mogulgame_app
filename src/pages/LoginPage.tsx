import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStatus } from '@sudobility/auth-components';
import { getFirebaseAuth } from '@sudobility/auth_lib';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { LoginPage as LoginPageComponent } from '@sudobility/building_blocks';
import { variants, ui } from '@sudobility/design';
import { CONSTANTS } from '../config/constants';
import { SEOHead } from '@sudobility/seo_lib';
import { analyticsService } from '../config/analytics';

/**
 * Authentication page supporting email/password sign-in, sign-up,
 * and Google OAuth. Automatically redirects authenticated users
 * to the home page.
 */
export default function LoginPage() {
  const { t } = useTranslation('common');
  const { user, loading } = useAuthStatus();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const auth = getFirebaseAuth();

  useEffect(() => {
    analyticsService.trackPageView('/login', 'Login');
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate(`/${lang || 'en'}/offers`, { replace: true });
    }
  }, [user, loading, navigate, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          role="status"
          aria-label="Loading authentication"
          className={variants.loading.spinner.default()}
        />
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p role="alert" className={ui.text.error}>
          {t('common.firebaseNotConfigured')}
        </p>
      </div>
    );
  }

  return (
    <>
      <SEOHead title={t('seo.login.title')} description={t('seo.login.description')} noIndex />
      <LoginPageComponent
        appName={CONSTANTS.APP_NAME}
        logo={<img src="/logo.png" alt={CONSTANTS.APP_NAME} className="h-12" />}
        onEmailSignIn={async (email, password) => {
          analyticsService.trackButtonClick('email_sign_in');
          await signInWithEmailAndPassword(auth, email, password);
        }}
        onEmailSignUp={async (email, password) => {
          analyticsService.trackButtonClick('email_sign_up');
          await createUserWithEmailAndPassword(auth, email, password);
        }}
        onGoogleSignIn={async () => {
          analyticsService.trackButtonClick('google_sign_in');
          await signInWithPopup(auth, new GoogleAuthProvider());
        }}
        onSuccess={() => {
          analyticsService.trackEvent('login_success');
          navigate(`/${lang || 'en'}/offers`, { replace: true });
        }}
      />
    </>
  );
}
