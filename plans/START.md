# Starter App Implementation Plan

> **Note**: This plan will also be saved to `./starter_app/plans/START.md` during implementation.

## Context

Create 6 interconnected starter projects that showcase the Sudobility architecture pattern. The projects demonstrate how to build a full-stack app with shared types, a Hono backend, a TanStack Query client library, a Zustand-based business logic library, a React web app, and a React Native mobile app.

The domain is simple: users create "history" records (datetime + value), and can view their histories plus a global total with percentage calculation.

## Design Decisions (Confirmed)

- **Database**: PostgreSQL + Drizzle ORM
- **Client caching**: TanStack Query (useQuery/useMutation) -- differs from shapeshyft_client's plain React state
- **Packages**: Use @sudobility/\* packages (building_blocks, components, auth-components, auth_lib, di_web, di, types)
- **Package scope**: @sudobility/starter_types, @sudobility/starter_client, etc.
- **starter_lib**: Zustand stores + manager hooks wrapping client hooks
- **API auth**: @sudobility/auth_service (no entity_service)

## Reference Files

| Pattern                   | Reference                                        |
| ------------------------- | ------------------------------------------------ |
| Types package             | `/Users/johnhuang/shapeshyft/shapeshyft_types/`  |
| API (Hono)                | `/Users/johnhuang/shapeshyft/shapeshyft_api/`    |
| Client class + hooks      | `/Users/johnhuang/shapeshyft/shapeshyft_client/` |
| Zustand stores + managers | `/Users/johnhuang/shapeshyft/shapeshyft_lib/`    |
| Web app (React)           | `/Users/johnhuang/shapeshyft/shapeshyft_app/`    |
| RN app                    | `/Users/johnhuang/sudojo/sudojo_app_rn/`         |

---

## Project 1: starter_types

**Location**: `./starter_types`
**Package**: `@sudobility/starter_types`

### Files

```
starter_types/
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    index.ts          # All type definitions + helpers
```

### package.json key fields

- name: `@sudobility/starter_types`
- dependencies: `@sudobility/types`
- devDependencies: `typescript ~5.9.3`, `eslint`, `prettier`
- scripts: `build`, `lint`, `typecheck`
- exports: dual ESM/CJS (same as shapeshyft_types)

### src/index.ts contents

```typescript
// Re-export from @sudobility/types
export type { ApiResponse, BaseResponse, NetworkClient, Optional } from '@sudobility/types';
import type { Optional, BaseResponse } from '@sudobility/types';

// --- User ---
export interface User {
  firebase_uid: string;
  email: string | null;
  display_name: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

// --- History ---
export interface History {
  id: string; // UUID
  user_id: string; // firebase_uid
  datetime: string; // ISO 8601 string
  value: number; // positive number
  created_at: string | null;
  updated_at: string | null;
}

export interface HistoryCreateRequest {
  datetime: string;
  value: number;
}

export interface HistoryUpdateRequest {
  datetime?: string;
  value?: number;
}

export interface HistoryTotalResponse {
  total: number;
}

// --- API Response helpers ---
export function successResponse<T>(data: T): BaseResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}

export function errorResponse(error: string): BaseResponse<never> {
  return { success: false, error, timestamp: new Date().toISOString() };
}
```

---

## Project 2: starter_api

**Location**: `./starter_api`
**Package**: `starter_api` (private)

### Files

```
starter_api/
  package.json
  tsconfig.json
  .env.example
  src/
    index.ts                    # Hono app entry point
    db/
      index.ts                  # Database connection (lazy init)
      schema.ts                 # Drizzle ORM schema
    middleware/
      firebaseAuth.ts           # Firebase auth middleware
    routes/
      index.ts                  # Route composition
      users.ts                  # GET /users/:userId
      histories.ts              # CRUD /users/:userId/histories
      historiesTotal.ts         # GET /histories/total
    services/
      firebase.ts               # Firebase Admin init + verifyIdToken
    lib/
      env-helper.ts             # getEnv / getRequiredEnv (copy from shapeshyft)
```

### package.json key dependencies

- `hono`, `@hono/zod-validator`, `zod`
- `drizzle-orm`, `postgres` (pg driver)
- `firebase-admin`
- `@sudobility/auth_service`
- `@sudobility/starter_types`
- `@sudobility/types`

### Database Schema (src/db/schema.ts)

**Schema name**: `starter`

**Table: users**

- `firebase_uid` VARCHAR(128) PRIMARY KEY
- `email` VARCHAR(255) nullable
- `display_name` VARCHAR(255) nullable
- `created_at` TIMESTAMP default now()
- `updated_at` TIMESTAMP default now()

**Table: histories**

- `id` UUID PRIMARY KEY (default gen_random_uuid())
- `user_id` VARCHAR(128) NOT NULL, FK → users.firebase_uid (CASCADE)
- `datetime` TIMESTAMP NOT NULL
- `value` NUMERIC(12,2) NOT NULL (positive, enforced in code)
- `created_at` TIMESTAMP default now()
- `updated_at` TIMESTAMP default now()

**Index**: `(user_id)` on histories

### Routes

**Public routes** (no auth):

- `GET /histories/total` → returns `{ total: number }` — sum of ALL histories.value across all users

**Auth-required routes** (firebaseAuthMiddleware):

- `GET /users/:userId` → returns user info (token must match userId)
- `GET /users/:userId/histories` → list all histories for userId
- `POST /users/:userId/histories` → create history (validate: value > 0)
- `PUT /users/:userId/histories/:historyId` → update history
- `DELETE /users/:userId/histories/:historyId` → delete history

### Middleware (src/middleware/firebaseAuth.ts)

- Same pattern as shapeshyft_api: verify Bearer token, reject anonymous, set `userId`/`userEmail` in context
- Uses `@sudobility/auth_service` for `isAnonymousUser`, `isSiteAdmin`
- Auto-creates user record (fire-and-forget)

### src/index.ts

- Same pattern as shapeshyft_api: Hono app, logger, cors, health check, route mounting
- Port from `PORT` env var (default 3001)
- `export default { port, fetch: app.fetch }`

### .env.example

```
DATABASE_URL=postgresql://user:password@localhost:5432/starter
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
PORT=3001
```

---

## Project 3: starter_client

**Location**: `./starter_client`
**Package**: `@sudobility/starter_client`

### Files

```
starter_client/
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    index.ts                    # Barrel exports
    network/
      index.ts
      StarterClient.ts          # Main client class
    hooks/
      index.ts
      useHistories.ts           # TanStack Query: list user histories
      useHistoriesTotal.ts      # TanStack Query: get total
      useHistoryMutations.ts    # TanStack Query: create/update/delete
    utils/
      index.ts
      starter-helpers.ts        # createAuthHeaders, buildUrl, handleApiError
    types.ts                    # FirebaseIdToken type, QUERY_KEYS
```

### package.json key fields

- name: `@sudobility/starter_client`
- peerDependencies: `@sudobility/starter_types`, `@sudobility/types`, `@tanstack/react-query >=5.0.0`, `react >=18.0.0`
- dependencies: `react`, `@tanstack/react-query`

### StarterClient class (src/network/StarterClient.ts)

```typescript
import type { NetworkClient } from '@sudobility/types';
import type { History, HistoryCreateRequest, HistoryUpdateRequest, HistoryTotalResponse } from '@sudobility/starter_types';
import type { BaseResponse } from '@sudobility/starter_types';

interface StarterClientConfig {
  baseUrl: string;
  networkClient: NetworkClient;
}

export class StarterClient {
  private baseUrl: string;
  private networkClient: NetworkClient;

  constructor(config: StarterClientConfig) { ... }

  // User
  async getUser(userId: string, token: string): Promise<BaseResponse<User>>

  // Histories
  async getHistories(userId: string, token: string): Promise<BaseResponse<History[]>>
  async createHistory(userId: string, data: HistoryCreateRequest, token: string): Promise<BaseResponse<History>>
  async updateHistory(userId: string, historyId: string, data: HistoryUpdateRequest, token: string): Promise<BaseResponse<History>>
  async deleteHistory(userId: string, historyId: string, token: string): Promise<BaseResponse<void>>

  // Total (public)
  async getHistoriesTotal(): Promise<BaseResponse<HistoryTotalResponse>>
}
```

### TanStack Query Hooks

**useHistories(networkClient, baseUrl, userId, token)**

```typescript
// Uses useQuery with key ['starter', 'histories', userId]
// Enabled only when userId && token are truthy
// Returns { data: History[], isLoading, error, refetch }
```

**useHistoriesTotal(networkClient, baseUrl)**

```typescript
// Uses useQuery with key ['starter', 'histories', 'total']
// Always enabled (public endpoint)
// Returns { data: HistoryTotalResponse, isLoading, error }
```

**useHistoryMutations(networkClient, baseUrl, userId, token)**

```typescript
// Returns { createHistory, updateHistory, deleteHistory }
// Each uses useMutation with onSuccess invalidating ['starter', 'histories', userId]
// Also invalidates ['starter', 'histories', 'total'] since mutations affect global total
```

### QUERY_KEYS (src/types.ts)

```typescript
export type FirebaseIdToken = string;

export const QUERY_KEYS = {
  histories: (userId: string) => ['starter', 'histories', userId] as const,
  historiesTotal: () => ['starter', 'histories', 'total'] as const,
  user: (userId: string) => ['starter', 'user', userId] as const,
} as const;
```

---

## Project 4: starter_lib

**Location**: `./starter_lib`
**Package**: `@sudobility/starter_lib`

### Files

```
starter_lib/
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    index.ts                      # Barrel exports
    business/
      index.ts
      stores/
        index.ts
        historiesStore.ts           # Zustand store for histories cache
      hooks/
        index.ts
        useHistoriesManager.ts      # Manager hook: histories + total + percentage
```

### package.json key fields

- name: `@sudobility/starter_lib`
- peerDependencies: `@sudobility/starter_client`, `@sudobility/starter_types`, `zustand >=5.0.0`
- dependencies: `zustand`, `react`

### historiesStore.ts

```typescript
// Zustand store keyed by userId
// Interface: { cache: Record<userId, { histories: History[], cachedAt: number }> }
// Methods: setHistories, getHistories, getCacheEntry, addHistory, updateHistory, removeHistory, clearAll
```

### useHistoriesManager hook

```typescript
export interface UseHistoriesManagerConfig {
  baseUrl: string;
  networkClient: NetworkClient;
  userId: Optional<string>;
  token: Optional<string>;
  autoFetch?: boolean;
}

export interface UseHistoriesManagerReturn {
  histories: History[];
  total: number;
  percentage: number; // (user's sum / total) * 100, or 0
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;
  createHistory: (data: HistoryCreateRequest) => Promise<void>;
  updateHistory: (historyId: string, data: HistoryUpdateRequest) => Promise<void>;
  deleteHistory: (historyId: string) => Promise<void>;
  refresh: () => void;
}
```

**Logic**:

1. Uses `useHistories()` and `useHistoriesTotal()` from starter_client
2. Uses `useHistoryMutations()` for create/update/delete
3. Syncs TanStack Query results → Zustand store for offline/cache fallback
4. Calculates percentage: `(userSum / total) * 100`
5. Returns merged data (TanStack Query data preferred, Zustand fallback)

---

## Project 5: starter_app

**Location**: `./starter_app`
**Package**: `@sudobility/starter_app` (private)

### Files

```
starter_app/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  tailwind.config.js
  postcss.config.js
  .env.example
  public/
    locales/
      en/common.json            # English translations
      ... (17 language folders, same set as shapeshyft)
    logo.png
  plans/
    START.md                    # This plan file (copied here)
  src/
    main.tsx                    # Entry point (init Firebase, i18n, render)
    App.tsx                     # Router with /:lang prefix
    i18n.ts                     # i18next config (17 languages)
    index.css                   # Tailwind imports
    vite-env.d.ts
    config/
      constants.ts              # API_URL, Firebase config, app constants
      initialize.ts             # Async init (Firebase, i18n)
      auth-config.ts            # Firebase auth config
    components/
      layout/
        TopBar.tsx              # AppTopBarWithFirebaseAuth from building_blocks
        Footer.tsx              # AppFooter from building_blocks
        ScreenContainer.tsx     # Layout wrapper (topbar + breadcrumbs + content + footer)
        ProtectedRoute.tsx      # Auth guard redirect
        LocalizedLink.tsx       # Language-aware <Link>
        LanguageRedirect.tsx    # Detect/redirect language
      providers/
        AuthProviderWrapper.tsx # Firebase auth provider from @sudobility/auth-components
    context/
      ThemeContext.tsx           # ThemeProvider from @sudobility/components
    hooks/
      useBreadcrumbs.ts
      useLocalizedNavigate.ts
    pages/
      HomePage.tsx              # "This is a template project" + links
      DocsPage.tsx              # MasterDetail layout with sections
      HistoriesPage.tsx         # Login prompt or histories list + percentage
      HistoryDetailPage.tsx     # Single history: date + value
      SettingsPage.tsx          # GlobalSettingsPage from building_blocks
      SitemapPage.tsx           # Languages on top, sitemap below
      LoginPage.tsx             # Firebase login (LoginPage from building_blocks)
```

### package.json key dependencies

- `react`, `react-dom`, `react-router-dom`
- `@tanstack/react-query`
- `firebase`
- `i18next`, `react-i18next`, `i18next-http-backend`, `i18next-browser-languagedetector`
- `tailwindcss`, `postcss`, `autoprefixer`
- `@sudobility/building_blocks`, `@sudobility/components`, `@sudobility/auth-components`, `@sudobility/auth_lib`
- `@sudobility/di_web`, `@sudobility/di`, `@sudobility/types`
- `@sudobility/starter_client`, `@sudobility/starter_lib`, `@sudobility/starter_types`
- `@sudobility/seo_lib`, `@sudobility/design`

### Route Structure (App.tsx)

```
/                           → redirect to /:defaultLang
/:lang                      → HomePage
/:lang/login                → LoginPage
/:lang/docs                 → DocsPage (MasterDetail)
/:lang/histories            → HistoriesPage (auth-guarded content)
/:lang/histories/:historyId → HistoryDetailPage
/:lang/settings             → SettingsPage
/:lang/sitemap              → SitemapPage
```

### Pages Detail

**HomePage**: Simple hero section. "This is a template project to show how to use Sudobility architecture." Links to Docs, Histories.

**DocsPage**: Uses MasterDetail from @sudobility/components.

- Master: sidebar with sections (API, Client, Lib, App)
- Detail: content describing what each project does
- Sections: starter_api, starter_client, starter_lib, starter_app

**HistoriesPage**:

- If not logged in: "Log in" button → navigates to /:lang/login
- If logged in: uses `useHistoriesManager` from starter_lib
  - Shows percentage bar/number
  - Lists histories (datetime, value) as clickable items
  - "Add History" button → modal or inline form (POST)
  - Each item links to `/:lang/histories/:historyId`

**HistoryDetailPage**:

- Uses route param `:historyId`
- Fetches from histories list (or direct API call)
- Displays: datetime (formatted), value
- Edit/Delete buttons

**SettingsPage**: Wraps `GlobalSettingsPage` from @sudobility/building_blocks (theme + font size)

**SitemapPage**: Same pattern as shapeshyft_app's SitemapPage

- Language selector grid at top (17 languages)
- Sitemap sections below: Main Pages, Documentation, Legal

### TopBar

- Uses `AppTopBarWithFirebaseAuth` from @sudobility/building_blocks
- Nav items: Home, Docs, Histories, Settings
- Language selector (17 languages with flag emojis)
- Firebase login/logout button

### Footer

- Uses component from @sudobility/building_blocks
- Links: Home, Docs, Settings, Sitemap
- Copyright

### i18n (17 languages)

Same language set as shapeshyft_app: `en, ar, de, es, fr, it, ja, ko, pt, ru, sv, th, uk, vi, zh, zh-hant`

Translation files at `public/locales/{lang}/common.json` with keys for:

- nav, home, docs, histories, settings, sitemap, breadcrumbs, auth, footer

### .env.example

```
VITE_STARTER_API_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Project 6: starter_app_rn

**Location**: `./starter_app_rn`
**Package**: `starter_app_rn` (private)

### Files

```
starter_app_rn/
  package.json
  tsconfig.json
  app.json
  App.tsx                       # Root: providers + navigation
  index.ts                      # registerRootComponent
  babel.config.js
  metro.config.js
  .env.example
  src/
    config/
      constants.ts              # API URL, Firebase config
      env.ts                    # Environment variable reader
      theme.ts                  # Light/dark theme definitions
    context/
      AuthContext.tsx            # Firebase Auth provider (same pattern as sudojo_app_rn)
      ApiContext.tsx             # Provides networkClient + baseUrl
      index.ts
    navigation/
      AppNavigator.tsx           # Bottom tabs: Histories + Settings
      HistoriesStack.tsx         # Stack: HistoriesList → HistoryDetail
      SettingsStack.tsx          # Stack: Settings screen
      types.ts                   # Navigation param types
      index.ts
    screens/
      HistoriesScreen.tsx        # Login prompt or histories list + percentage
      HistoryDetailScreen.tsx    # Single history detail
      SettingsScreen.tsx         # Theme selector, sign out
      SplashScreen.tsx           # Loading screen
      index.ts
    stores/
      configureStores.ts         # AsyncStorage config for Zustand
      settingsStore.ts           # Theme preference
      index.ts
    i18n/
      index.ts                   # i18next init for RN
    polyfills/
      localStorage.ts            # AsyncStorage polyfill for Zustand
```

### package.json key dependencies

- `react`, `react-native`, `expo`
- `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
- `@tanstack/react-query`
- `firebase`
- `i18next`, `react-i18next`
- `zustand`
- `@react-native-async-storage/async-storage`
- `react-native-safe-area-context`, `react-native-screens`, `react-native-gesture-handler`
- `react-native-heroicons`
- `@sudobility/building_blocks_rn`, `@sudobility/di`, `@sudobility/types`
- `@sudobility/starter_client`, `@sudobility/starter_lib`, `@sudobility/starter_types`

### App.tsx structure

Same pattern as sudojo_app_rn:

```
GestureHandlerRootView
  SafeAreaProvider
    ThemeProvider
      AuthProvider
        ApiProvider
          QueryClientProvider
            AppContent (shows SplashScreen until auth ready, then AppNavigator)
```

### Navigation

- Bottom tabs: "Histories" tab + "Settings" tab
- Histories tab: stack with HistoriesScreen → HistoryDetailScreen
- Settings tab: stack with SettingsScreen

### Screens

- **HistoriesScreen**: If not logged in → sign-in buttons. If logged in → histories list + percentage
- **HistoryDetailScreen**: Date + value display
- **SettingsScreen**: Theme toggle (light/dark/system), sign out button

---

## Implementation Order

1. **starter_types** (no dependencies)
2. **starter_api** (depends on starter_types)
3. **starter_client** (depends on starter_types)
4. **starter_lib** (depends on starter_client + starter_types)
5. **starter_app** (depends on starter_client + starter_lib + starter_types)
6. **starter_app_rn** (depends on starter_client + starter_lib + starter_types)

Each project: create package.json → tsconfig → source files → `bun install`

---

## Verification

### starter_types

- `cd starter_types && bun install && bun run typecheck`

### starter_api

- `cd starter_api && bun install && bun run typecheck`
- Create PostgreSQL database, set DATABASE_URL in .env.local
- `bun run dev` → test `GET /` returns health check
- Use curl to test endpoints

### starter_client

- `cd starter_client && bun install && bun run typecheck`

### starter_lib

- `cd starter_lib && bun install && bun run typecheck`

### starter_app

- `cd starter_app && bun install && bun run dev`
- Open browser: navigate pages, test language switching, login, histories CRUD

### starter_app_rn

- `cd starter_app_rn && bun install`
- `npx expo start` → test on iOS/Android simulator
- Test: auth flow, histories display, settings
