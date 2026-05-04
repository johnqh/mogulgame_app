import { ThemeProvider as BaseThemeProvider } from '@sudobility/components';

/**
 * Application-level theme provider wrapping the shared `BaseThemeProvider`
 * with project-specific localStorage keys for theme and font size persistence.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseThemeProvider themeStorageKey="starter-theme" fontSizeStorageKey="starter-font-size">
      {children}
    </BaseThemeProvider>
  );
}
