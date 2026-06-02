import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type MenuItemConfig,
  type AuthMenuItem,
  type AuthActionProps,
  type TopBarConfig,
} from '@sudobility/building_blocks';
import { AuthAction } from '@sudobility/auth-components';
import type { ComponentType } from 'react';
import {
  BookOpenIcon,
  TrophyIcon,
  TicketIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  FireIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { CONSTANTS, SUPPORTED_LANGUAGES, isLanguageSupported } from '../../config/constants';
import LocalizedLink from './LocalizedLink';

const LANGUAGE_INFO: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇺🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  es: { name: 'Español', flag: '🇪🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  ja: { name: '日本語', flag: '🇯🇵' },
  ko: { name: '한국어', flag: '🇰🇷' },
  pt: { name: 'Português', flag: '🇧🇷' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  sv: { name: 'Svenska', flag: '🇸🇪' },
  th: { name: 'ไทย', flag: '🇹🇭' },
  uk: { name: 'Українська', flag: '🇺🇦' },
  vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
  zh: { name: '简体中文', flag: '🇨🇳' },
  'zh-hant': { name: '繁體中文', flag: '🇹🇼' },
};

const linkWrapper = ({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <LocalizedLink to={href} className={className}>
    {children}
  </LocalizedLink>
);

/**
 * Hook returning TopBar configuration for AppPageLayout.
 */
export function useTopBarConfig(): TopBarConfig {
  const { t } = useTranslation('common');
  const { navigate, switchLanguage, currentLanguage } = useLocalizedNavigate();

  const languages = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map(code => ({
        code,
        name: LANGUAGE_INFO[code]?.name || code.toUpperCase(),
        flag: LANGUAGE_INFO[code]?.flag || '🌐',
      })),
    []
  );

  const menuItems: MenuItemConfig[] = useMemo(
    () => [
      {
        id: 'how-to-play',
        label: t('nav.howToPlay'),
        icon: BookOpenIcon,
        href: '/how-to-play',
      },
      {
        id: 'leaderboard',
        label: t('nav.leaderboard'),
        icon: TrophyIcon,
        href: '/leaderboard',
      },
      {
        id: 'popular',
        label: t('nav.popular'),
        icon: FireIcon,
        href: '/popular',
      },
      {
        id: 'settings',
        label: t('nav.settings'),
        icon: Cog6ToothIcon,
        href: '/settings',
      },
    ],
    [t]
  );

  const authMenuItems: AuthMenuItem[] = useMemo(
    () => [
      {
        id: 'offers',
        label: t('nav.offers'),
        icon: <TicketIcon className="w-4 h-4" />,
        onClick: () => navigate('/offers'),
      },
      {
        id: 'my-favorites',
        label: t('nav.myFavorites'),
        icon: <HeartIcon className="w-4 h-4" />,
        onClick: () => navigate('/my-favorites'),
      },
      {
        id: 'my-searches',
        label: t('nav.mySearches'),
        icon: <MagnifyingGlassIcon className="w-4 h-4" />,
        onClick: () => navigate('/my-searches'),
      },
    ],
    [t, navigate]
  );

  const handleLanguageChange = (newLang: string) => {
    if (isLanguageSupported(newLang)) {
      switchLanguage(newLang);
    }
  };

  return {
    variant: 'firebase',
    logo: {
      src: '/logo.png',
      appName: CONSTANTS.APP_NAME,
      onClick: () => navigate('/'),
    },
    menuItems,
    languages,
    currentLanguage,
    onLanguageChange: handleLanguageChange,
    LinkComponent: linkWrapper,
    AuthActionComponent: AuthAction as ComponentType<AuthActionProps>,
    onLoginClick: () => navigate('/login'),
    authenticatedMenuItems: authMenuItems,
    sticky: true,
  };
}
