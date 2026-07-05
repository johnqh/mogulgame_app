import { initializeWebApp } from '@sudobility/di_web';
import { configureTheme } from '@sudobility/design';
import { defaultTheme, generateThemeCSS } from '@sudobility/design/themes';
import { initializeI18n } from '../i18n';

// Activate the design-system theme so `@sudobility/components` render theme-aware
// semantic classes (bg-primary, ...) that resolve via the :root/.dark CSS
// variables in index.css + createTailwindPreset() in tailwind.config.js —
// matching the RN apps and making all design styles + light/dark work.
configureTheme(defaultTheme);
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.id = 'sudobility-design-theme';
  styleEl.textContent = generateThemeCSS(defaultTheme);
  document.head.appendChild(styleEl);
}

/**
 * Bootstrap the application by initialising the DI container, Firebase,
 * and i18n before the React tree mounts. Called once from `main.tsx`.
 */
export async function initializeApp(): Promise<void> {
  await initializeWebApp({
    firebaseConfig: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    },
    initializeI18n,
  });
}
