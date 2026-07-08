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
- **i18n**: i18next (15 languages, RTL support)
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
├── utils/
│   ├── crawler.ts                        # IS_CRAWLER — module-scope crawler detection
│   ├── formatDateTime.ts                 # Locale-aware date/time formatting
│   ├── BreadcrumbBuilder.ts              # Dynamic breadcrumb titles
│   └── languageRouting.ts                # Language prefix helpers
└── pages/
    ├── HomePage.tsx                      # Property search with Google Maps (map/list toggle)
    ├── PropertyDetailPage.tsx            # Property detail with photo carousel + sticky offer panel
    ├── PopularPage.tsx                   # Most-viewed / most-favorited / most-offered properties
    ├── MyFavoritesPage.tsx               # User's favorited properties (protected)
    ├── MySearchesPage.tsx                # User's search history (protected)
    ├── RecentSearchesPage.tsx            # Site-wide recent searches (public)
    ├── HowToPlayPage.tsx                 # Game rules and explanation
    ├── WhyPlayPage.tsx                   # Marketing / value proposition
    ├── OffersPage.tsx                    # User's current and past offers
    ├── LeaderboardPage.tsx               # Player rankings by balance or wins
    ├── LoginPage.tsx                     # Firebase auth (email + Google)
    ├── SettingsPage.tsx                  # Theme and font settings
    └── SitemapPage.tsx                   # All pages and languages
```

Outside `src/`:

- `functions/_middleware.js` — Cloudflare Pages Function. Injects a committed pre-rendered
  snapshot from `public/html/<route>/index.html` into the live shell, 301s trailing slashes,
  and rewrites `<html lang>`. Only static routes are pre-rendered; `/properties/:id` is not.
- `scripts/prerender.mjs` — Playwright renderer that produces those snapshots (`bun run generate`).
- `scripts/push_all.sh` — release pipeline across all six mogulgame repos. See Gotchas.

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

15 supported languages: en, de, es, fr, it, ja, ko, pt, ru, sv, th, uk, vi, zh, zh-hant.

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

**Note**: `CONSTANTS.API_URL` defaults to `http://localhost:8029`. The API server's *code* default is
`8022` (`mogulgame_api/src/index.ts`); it listens on 8029 only because its `.env`/`.env.example` set
`PORT=8029`. If you run the API without a `.env`, it will be on 8022 and the app will not reach it.

## Related Projects

- **mogulgame_types** — Shared type definitions (Property, PretendOffer, UserProfile, Transaction, Leaderboard) plus a few runtime helpers (`successResponse`, `errorResponse`, `isSuccessResponse`, `isErrorResponse`, `isCrawler`)
- **mogulgame_client** — API client SDK with TanStack Query hooks for properties, offers, user profile, leaderboard, favorites, popular
- **mogulgame_lib** — Pure, synchronous helpers only: offer validation (5x balance rule) and currency formatting. No network, no React state, no stores.
- **mogulgame_api** — Backend server proxying **RealtyAPI.io**, plus offer resolution and leaderboard
- **mogulgame_app_rn** — React Native counterpart; shares mogulgame_client, mogulgame_lib, and mogulgame_types

**RealtyAPI.io is one provider, dispatched by country** — not Zillow or StreetEasy (neither appears
anywhere in the codebase). `US→realtor`, `CA→realtorca`, `GB→zoopla`, `AE→bayut`, `ES→idealista`,
`AU→realestateau`. The `Property.zestimate` field name is the only Zillow residue.

**These are published npm packages, not workspace links.** `node_modules/@sudobility/mogulgame_*`
are real directories and `vite.config.ts` aliases only react/react-dom/react-helmet-async. Editing
`mogulgame_client/src` has **no effect** on this app until it is published and the dep bumped. For
local iteration use `bun link`.

Uses `@sudobility/building_blocks` for shared shell components (TopBar, LoginPage, SettingsPage, SudobilityAppWithFirebaseAuth).

## Coding Patterns

- All routes are language-prefixed: `/:lang/*` (e.g., `/en/offers`, `/ja/leaderboard`) -- never create routes without the language prefix
- Pages are lazy-loaded with `React.lazy()` and wrapped in `<Suspense>` for code splitting
- 15 languages are supported -- use `LocalizedLink` and `useLocalizedNavigate` for navigation
- `ThemeContext` provides light/dark theme switching throughout the app
- `ProtectedRoute` component guards authenticated pages -- wrap any page requiring auth with it
- Vite config deduplicates React and shared dependencies to prevent multiple React instances
- i18next is configured in `src/i18n.ts` with language detection and fallback to English
- Google Maps is provided via `APIProvider` from `@vis.gl/react-google-maps`

## Gotchas

- API URL: `.env` defaults to `localhost:8029`. The API's code default is 8022 -- it only listens on 8029 because its own `.env` sets `PORT`
- Vite deduplicates React and shared deps in its config -- if you add new shared dependencies, check if they need deduplication
- All routes MUST be under the `/:lang/` prefix -- routes without the language prefix will not work correctly
- Firebase configuration requires all `VITE_FIREBASE_*` environment variables to be set; missing any will break authentication
- Google Maps requires `VITE_GOOGLE_MAPS_API_KEY` to be set; the map won't render without it
- `@sudobility/building_blocks` provides shared UI components -- check there before creating duplicate components
- **Auth headers are attached twice.** `StarterClient` sets `Authorization` explicitly on protected calls, but `FirebaseAuthNetworkService` also back-fills it whenever the header is absent. So "public" endpoints still carry a Bearer token when signed in; the `createHeaders()` vs `createAuthHeaders()` split in the SDK is documentation, not enforcement
- **Several pages bypass the SDK.** `HomePage`, `PropertyDetailPage`, `MyFavoritesPage`, and `PopularPage` hand-roll `networkClient.get/post/delete` with hand-built URLs and query keys for favorites, while `mogulgame_client` exports `useFavorites`/`useFavoriteCheck`/`usePopularProperties` that go unused. `/api/v1/searches/*` has no SDK coverage at all. Two sources of truth -- prefer the SDK when touching these
- **Crawler requests must stay side-effect-free.** `src/utils/crawler.ts` sets `IS_CRAWLER` once at module scope and `PropertyDetailPage`/`HomePage` pass `crawler: IS_CRAWLER` to the hooks, which appends `?crawler=true`. The API then skips the RealtyAPI refresh, the `property_views` write, and offer resolution. Do not add a crawler-conditional branch that *grants* anything -- the flag is client-supplied and must only ever reduce work
- **`scripts/push_all.sh` silently skips repos with clean working trees** and still exits 0 printing "All Projects Processed Successfully!". If you commit before running it, nothing publishes. Verify with `git rev-list --count origin/main..main` in each repo afterward. It also runs `git add -A`, so a stray `.playwright-mcp/` dir would be committed
