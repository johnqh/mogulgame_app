# MogulGame App

Real estate simulation game where users place pretend offers on real properties.

**Package**: `@sudobility/mogulgame_app` (private, BUSL-1.1)

## Tech Stack

- **Language**: TypeScript (strict mode, JSX)
- **Runtime**: Bun
- **Package Manager**: Bun (do not use npm/yarn/pnpm for installing dependencies)
- **Framework**: React 19
- **Routing**: React Router v7
- **Build**: Vite 6
- **Styling**: Tailwind CSS 3
- **Maps**: Google Maps via `@vis.gl/react-google-maps`
- **i18n**: i18next (16 languages, RTL support)
- **Auth**: Firebase Auth

## Project Structure

```
src/
├── main.tsx                              # App entry point
├── App.tsx                               # Router setup, lazy-loaded routes
├── i18n.ts                               # i18next configuration
├── config/
│   ├── constants.ts                      # App constants, supported languages, Google Maps key
│   ├── auth-config.ts                    # Firebase auth configuration
│   └── initialize.ts                     # App initialization
├── context/
│   └── ThemeContext.tsx                   # Theme provider
├── components/
│   ├── ErrorBoundary.tsx                 # Error boundary with retry support
│   ├── layout/
│   │   ├── TopBar.tsx                    # Navigation bar
│   │   ├── Footer.tsx                    # Page footer
│   │   ├── ScreenContainer.tsx           # Page wrapper
│   │   ├── ProtectedRoute.tsx            # Auth guard
│   │   ├── LocalizedLink.tsx             # Language-aware links
│   │   └── LanguageRedirect.tsx          # Auto-redirect to lang prefix
│   └── providers/
│       └── AuthProviderWrapper.tsx       # Firebase auth provider
├── hooks/
│   ├── useLocalizedNavigate.ts           # Navigate with lang prefix
│   └── useDocumentLanguage.ts            # Set HTML lang attribute
├── utils/
│   └── formatDateTime.ts                 # Locale-aware date/time formatting
└── pages/
    ├── HomePage.tsx                      # Property search with Google Maps (map/list toggle)
    ├── PropertyDetailPage.tsx            # Property detail with photo carousel + sticky offer panel
    ├── HowToPlayPage.tsx                 # Game rules and explanation
    ├── OffersPage.tsx                    # User's current and past offers
    ├── LeaderboardPage.tsx               # Player rankings by balance or wins
    ├── LoginPage.tsx                     # Firebase auth (email + Google)
    ├── SettingsPage.tsx                  # Theme and font settings
    └── SitemapPage.tsx                   # All pages and languages
```

## Configuration Files

- `seo.config.mjs` - SEO route config for generate-seo-assets.mjs (sitemap.xml, robots.txt, per-route meta)

## Commands

```bash
bun run dev            # Vite dev server
bun run build          # TypeScript check + Vite build
bun run preview        # Preview production build
bun run typecheck      # TypeScript check
bun run lint           # Run ESLint
bun run format         # Format with Prettier
bun run seo:fetch      # Download generate-seo-assets.mjs to /tmp
bun run verify         # Run typecheck + lint + format:check (no test suite; relies on type checking)
```

## Routing

Language-prefixed routes: `/:lang/*` (e.g., `/en/offers`, `/ja/leaderboard`).

Main routes:

- `/` — Property search with Google Maps
- `/properties/:propertyId` — Property detail with offer panel
- `/how-to-play` — Game rules
- `/offers` — My offers (protected)
- `/leaderboard` — Player rankings
- `/login` — Authentication
- `/settings` — User preferences

16 supported languages: en, ar, de, es, fr, it, ja, ko, pt, ru, sv, th, uk, vi, zh, zh-hant.

Pages are lazy-loaded with React Suspense.

## Shared Components

Uses `@sudobility/building_blocks` for:

- TopBar, LoginPage, SettingsPage, SudobilityAppWithFirebaseAuth

## Environment Variables

| Variable                    | Description          | Default                 |
| --------------------------- | -------------------- | ----------------------- |
| `VITE_API_URL`              | Backend API URL      | `http://localhost:8029` |
| `VITE_GOOGLE_MAPS_API_KEY`  | Google Maps API key  | required                |
| `VITE_FIREBASE_API_KEY`     | Firebase API key     | required                |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | required                |
| `VITE_FIREBASE_PROJECT_ID`  | Firebase project ID  | required                |
| `VITE_APP_NAME`             | Application name     | `MogulGame`             |
| `VITE_APP_DOMAIN`           | Application domain   | `localhost`             |

**Note**: The default API URL in constants is `http://localhost:8029`, matching the API server's default port.

## Related Projects

- **mogulgame_types** — Shared type definitions (Property, PretendOffer, UserProfile, Transaction, Leaderboard)
- **mogulgame_client** — API client SDK with TanStack Query hooks for properties, offers, user profile, leaderboard
- **mogulgame_lib** — Business logic: offer validation (5x balance rule), balance calculation, resolution formatting
- **mogulgame_api** — Backend server with RealtyAPI proxy (Zillow/StreetEasy), offer resolution, leaderboard
- **mogulgame_app_rn** — React Native counterpart; shares mogulgame_client, mogulgame_lib, and mogulgame_types

Uses `@sudobility/building_blocks` for shared shell components (TopBar, LoginPage, SettingsPage, SudobilityAppWithFirebaseAuth).

## Coding Patterns

- All routes are language-prefixed: `/:lang/*` (e.g., `/en/offers`, `/ja/leaderboard`) -- never create routes without the language prefix
- Pages are lazy-loaded with `React.lazy()` and wrapped in `<Suspense>` for code splitting
- 16 languages are supported with RTL support (Arabic) -- use `LocalizedLink` and `useLocalizedNavigate` for navigation
- `ThemeContext` provides light/dark theme switching throughout the app
- `ProtectedRoute` component guards authenticated pages -- wrap any page requiring auth with it
- Vite config deduplicates React and shared dependencies to prevent multiple React instances
- i18next is configured in `src/i18n.ts` with language detection and fallback to English
- Google Maps is provided via `APIProvider` from `@vis.gl/react-google-maps`

## Gotchas

- API URL: `.env` defaults to `localhost:8029` to match the API server (`mogulgame_api`) -- verify `VITE_API_URL` matches your running API if using a different port
- Vite deduplicates React and shared deps in its config -- if you add new shared dependencies, check if they need deduplication
- All routes MUST be under the `/:lang/` prefix -- routes without the language prefix will not work correctly
- Firebase configuration requires all `VITE_FIREBASE_*` environment variables to be set; missing any will break authentication
- Google Maps requires `VITE_GOOGLE_MAPS_API_KEY` to be set; the map won't render without it
- `@sudobility/building_blocks` provides shared UI components -- check there before creating duplicate components
