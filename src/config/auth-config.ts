import type { AuthTexts, AuthErrorTexts } from '@sudobility/auth-components';
import type { TFunction } from 'i18next';
import { getFirebaseErrorMessage } from '@sudobility/auth_lib';

/**
 * Build a fully localised `AuthTexts` object from the current i18n
 * translation function. Used by `AuthProviderWrapper` to pass
 * translated labels to the shared auth components.
 */
export function createAuthTexts(t: TFunction): AuthTexts {
  return {
    signInTitle: t('signInTitle'),
    signInWithEmail: t('signInWithEmail'),
    createAccount: t('createAccount'),
    resetPassword: t('resetPassword'),
    signIn: t('signIn'),
    signUp: t('signUp'),
    logout: t('logout'),
    login: t('login'),
    continueWithGoogle: t('continueWithGoogle'),
    continueWithApple: 'Continue with Apple',
    continueWithEmail: t('continueWithEmail'),
    sendResetLink: t('sendResetLink'),
    backToSignIn: t('backToSignIn'),
    close: t('close'),
    email: t('email'),
    password: t('password'),
    confirmPassword: t('confirmPassword'),
    displayName: t('displayName'),
    emailPlaceholder: t('emailPlaceholder'),
    passwordPlaceholder: t('passwordPlaceholder'),
    confirmPasswordPlaceholder: t('confirmPasswordPlaceholder'),
    displayNamePlaceholder: t('displayNamePlaceholder'),
    forgotPassword: t('forgotPassword'),
    noAccount: t('noAccount'),
    haveAccount: t('haveAccount'),
    or: t('or'),
    resetEmailSent: t('resetEmailSent'),
    resetEmailSentDesc: t('resetEmailSentDesc'),
    passwordMismatch: t('passwordMismatch'),
    passwordTooShort: t('passwordTooShort'),
    loading: t('loading'),
  };
}

/**
 * Build a mapping from Firebase error codes to human-readable messages
 * using the shared `getFirebaseErrorMessage` helper.
 */
export function createAuthErrorTexts(): AuthErrorTexts {
  return {
    'auth/user-not-found': getFirebaseErrorMessage('auth/user-not-found'),
    'auth/wrong-password': getFirebaseErrorMessage('auth/wrong-password'),
    'auth/invalid-email': getFirebaseErrorMessage('auth/invalid-email'),
    'auth/invalid-credential': getFirebaseErrorMessage('auth/invalid-credential'),
    'auth/email-already-in-use': getFirebaseErrorMessage('auth/email-already-in-use'),
    'auth/weak-password': getFirebaseErrorMessage('auth/weak-password'),
    'auth/too-many-requests': getFirebaseErrorMessage('auth/too-many-requests'),
    'auth/network-request-failed': getFirebaseErrorMessage('auth/network-request-failed'),
    'auth/popup-closed-by-user': getFirebaseErrorMessage('auth/popup-closed-by-user'),
    'auth/popup-blocked': getFirebaseErrorMessage('auth/popup-blocked'),
    'auth/account-exists-with-different-credential': getFirebaseErrorMessage(
      'auth/account-exists-with-different-credential'
    ),
    'auth/operation-not-allowed': getFirebaseErrorMessage('auth/operation-not-allowed'),
    default: getFirebaseErrorMessage(''),
  };
}
