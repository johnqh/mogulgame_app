# Project Architecture Onboarding Guide

This guide explains how to architect a new project using the Sudobility common architecture. It is based on the patterns established across Sudojo, ShapeShyft, and Whisperly.

---

## Table of Contents

1. [Overview](#overview)
2. [Package Structure](#package-structure)
3. [Common Libraries](#common-libraries)
4. [Step 1: Create `{project}_types`](#step-1-create-project_types)
5. [Step 2: Create `{project}_api`](#step-2-create-project_api)
6. [Step 3: Create `{project}_client`](#step-3-create-project_client)
7. [Step 4: Create `{project}_lib`](#step-4-create-project_lib)
8. [Step 5: Create `{project}_app` (Web)](#step-5-create-project_app-web)
9. [Step 6: Create `{project}_app_rn` (React Native, optional)](#step-6-create-project_app_rn-react-native-optional)
10. [Firebase Setup](#firebase-setup)
11. [Environment Variables](#environment-variables)
12. [CI/CD with GitHub Actions](#cicd-with-github-actions)
13. [LLM Integration via ShapeShyft](#llm-integration-via-shapeshyft)
14. [Common Patterns](#common-patterns)
15. [Localization](#localization)
16. [Subscriptions & Rate Limiting](#subscriptions--rate-limiting)
17. [Checklist](#checklist)

---

## Overview

Every Sudobility project follows a **layered monorepo architecture** with clear separation of concerns:

```
{project}_types     → Shared TypeScript types (universal: backend + frontend)
{project}_api       → Backend REST API (Hono + Bun + PostgreSQL + Drizzle)
{project}_client    → API client library with React hooks (web + React Native)
{project}_lib       → Business logic, Zustand stores, manager hooks (web + React Native)
{project}_app       → Web frontend (React + Vite)
{project}_app_rn    → React Native mobile app (optional)
```

**Data flow:**

```
UI Components (app / app_rn)
       ↓ uses
Business Logic (lib) — Zustand stores + manager hooks
       ↓ uses
API Client (client) — TanStack Query hooks + HTTP client class
       ↓ uses
Shared Types (types) — TypeScript interfaces, Zod schemas, response helpers
       ↓ calls
Backend API (api) — Hono routes + Drizzle ORM + PostgreSQL
```

**Package manager:** Always use **Bun**. Never use npm, yarn, or pnpm.

---

## Package Structure

A typical project directory looks like:

```
~/myproject/
├── myproject_types/          # npm: @sudobility/myproject_types
├── myproject_api/            # Docker: myproject_api
├── myproject_client/         # npm: @sudobility/myproject_client
├── myproject_lib/            # npm: @sudobility/myproject_lib
├── myproject_app/            # Deployed to Cloudflare Pages
├── myproject_app_rn/         # (optional) iOS/Android app
└── package.json              # Root monorepo config (minimal)
```

Each sub-package is its own git repository with its own `package.json`, CI/CD workflow, and versioning.

---

## Common Libraries

These shared libraries provide infrastructure so you don't rebuild common functionality.

### Universal (Backend + Frontend)

| Package             | Purpose                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@sudobility/types` | Base types: `ApiResponse`, `BaseResponse`, `Optional`, `PaginatedResponse`, `successResponse()`, `errorResponse()` |

### Backend Only

| Package                            | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `@sudobility/auth_service`         | Firebase Admin auth helpers, JWT verification middleware    |
| `@sudobility/entity_service`       | Entity (organization) management, member roles, permissions |
| `@sudobility/ratelimit_service`    | Rate limiting with `EntitlementHelper`, `RateLimitChecker`  |
| `@sudobility/subscription_service` | RevenueCat subscription verification, `SubscriptionHelper`  |

### Web Frontend

| Package                               | Purpose                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `@sudobility/design_system`           | Design tokens, color system                                                                                |
| `@sudobility/di`                      | Dependency injection interfaces                                                                            |
| `@sudobility/di_web`                  | Web DI implementations (Firebase, analytics, network)                                                      |
| `@sudobility/components`              | Shared UI components (ThemeProvider, LanguageValidator, PerformancePanel, etc.)                            |
| `@sudobility/building_blocks`         | App wrappers: `SudobilityApp`, `SudobilityAppWithFirebaseAuth`, `SudobilityAppWithFirebaseAuthAndEntities` |
| `@sudobility/entity_client`           | Entity management React hooks                                                                              |
| `@sudobility/entity_pages`            | Entity management UI pages                                                                                 |
| `@sudobility/ratelimit_client`        | Rate limit React hooks                                                                                     |
| `@sudobility/ratelimit_pages`         | Rate limit UI pages                                                                                        |
| `@sudobility/subscription-components` | Paywall and subscription UI                                                                                |
| `@sudobility/auth-components`         | Auth UI components                                                                                         |
| `@sudobility/auth_lib`                | Auth utility hooks                                                                                         |
| `@sudobility/devops-components`       | NetworkProvider, network status                                                                            |

### React Native

| Package                          | Purpose                         |
| -------------------------------- | ------------------------------- |
| `@sudobility/di_rn`              | React Native DI implementations |
| `@sudobility/components_rn`      | React Native shared components  |
| `@sudobility/building_blocks_rn` | React Native app wrappers       |

---

## Step 1: Create `{project}_types`

The types package is the **contract** between frontend and backend. Changes flow from here.

### Tech Stack

- TypeScript, Zod
- Dual ESM/CJS output for maximum compatibility
- Published to npm as `@sudobility/{project}_types`

### Structure

```
myproject_types/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # All type exports
│   └── index.test.ts         # Type validation tests
└── dist/
    ├── index.js              # ESM
    ├── index.cjs             # CJS
    └── index.d.ts            # Declarations
```

### What to Define

```typescript
// src/index.ts

// Re-export common types from @sudobility/types
export type {
  ApiResponse,
  BaseResponse,
  Optional,
  PaginatedResponse,
  PaginationInfo,
  PaginationOptions,
} from '@sudobility/types';

// Re-export response helpers
export { successResponse, errorResponse } from '@sudobility/types';

// =============================================================================
// Entity Types (database models)
// =============================================================================

export interface Project {
  uuid: string;
  entity_id: string;
  name: string;
  description: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

// =============================================================================
// Request Types
// =============================================================================

export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
}

// =============================================================================
// Query Params
// =============================================================================

export interface ProjectQueryParams {
  limit?: number;
  offset?: number;
}
```

### package.json

```json
{
  "name": "@sudobility/myproject_types",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc && cp dist/index.js dist/index.cjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src/",
    "verify": "bun run typecheck && bun run lint && bun run test:run && bun run build"
  },
  "peerDependencies": {
    "@sudobility/types": "*"
  }
}
```

---

## Step 2: Create `{project}_api`

The API server handles all backend logic, database access, and authentication.

### Tech Stack

| Technology             | Purpose                                |
| ---------------------- | -------------------------------------- |
| **Bun**                | Runtime                                |
| **Hono**               | Web framework (lightweight, typed)     |
| **PostgreSQL**         | Database (always use Postgres for SQL) |
| **Drizzle ORM**        | Type-safe SQL ORM                      |
| **Firebase Admin SDK** | JWT authentication                     |
| **Zod**                | Request validation                     |

### Structure

```
myproject_api/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .github/workflows/ci-cd.yml
├── .env.example
├── src/
│   ├── index.ts              # Entry point (Hono app setup)
│   ├── db/
│   │   ├── index.ts          # Database connection (lazy init)
│   │   └── schema.ts         # Drizzle schema definitions
│   ├── routes/
│   │   ├── index.ts          # Route aggregation
│   │   ├── projects.ts       # Project CRUD
│   │   └── ...               # Domain-specific routes
│   ├── middleware/
│   │   ├── firebaseAuth.ts   # Firebase JWT middleware
│   │   └── rateLimit.ts      # Rate limiting
│   ├── schemas/
│   │   └── index.ts          # Zod validation schemas
│   ├── services/             # Business logic helpers
│   └── lib/
│       └── env-helper.ts     # Environment utilities
└── tests/                    # Integration tests
```

### Entry Point Pattern

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { routes } from './routes';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', c => c.json({ status: 'ok' }));

// Mount API routes
app.route('/api/v1', routes);

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
  idleTimeout: 120,
};
```

### Database Schema Pattern

```typescript
// src/db/schema.ts
import { pgTable, pgSchema, uuid, varchar, timestamp, text, boolean } from 'drizzle-orm/pg-core';

export const schema = pgSchema('myproject');

export const projects = schema.table('projects', {
  uuid: uuid('uuid').primaryKey().defaultRandom(),
  entity_id: uuid('entity_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

### Database Connection Pattern

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL not set');
    const client = postgres(connectionString);
    db = drizzle(client, { schema });
  }
  return db;
}
```

### Route Pattern

```typescript
// src/routes/projects.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { projects } from '../db/schema';
import { successResponse, errorResponse } from '@sudobility/myproject_types';
import { projectCreateSchema } from '../schemas';

const router = new Hono();

// GET /entities/:entitySlug/projects
router.get('/', async c => {
  const entitySlug = c.req.param('entitySlug');
  const db = getDb();
  const results = await db.select().from(projects).where(eq(projects.entity_id, entitySlug));
  return c.json(successResponse(results));
});

// POST /entities/:entitySlug/projects
router.post('/', zValidator('json', projectCreateSchema), async c => {
  const body = c.req.valid('json');
  const db = getDb();
  const [created] = await db.insert(projects).values(body).returning();
  return c.json(successResponse(created), 201);
});

export default router;
```

### Auth Middleware Pattern

```typescript
// src/middleware/firebaseAuth.ts
import { Context, Next } from 'hono';
import { verifyIdToken } from '@sudobility/auth_service';

export async function firebaseAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await verifyIdToken(token);
    c.set('userId', decoded.uid);
    c.set('userEmail', decoded.email);
    await next();
  } catch {
    return c.json(errorResponse('Invalid token'), 401);
  }
}
```

### Route Aggregation Pattern

```typescript
// src/routes/index.ts
import { Hono } from 'hono';
import { firebaseAuthMiddleware } from '../middleware/firebaseAuth';
import projectsRouter from './projects';

const routes = new Hono();

// Public routes (no auth)
routes.route('/public', publicRouter);

// Protected routes
routes.use('*', firebaseAuthMiddleware);
routes.route('/entities/:entitySlug/projects', projectsRouter);

export { routes };
```

### API Environment Variables

```env
# .env.example
DATABASE_URL=postgres://user:password@localhost:5432/myproject
PORT=3000

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# RevenueCat (for subscription/rate-limit checks)
REVENUECAT_API_KEY=

# Admin access
SITEADMIN_EMAILS=admin@example.com
```

### Key Dependencies

```json
{
  "dependencies": {
    "hono": "^4.x",
    "@hono/zod-validator": "^0.x",
    "drizzle-orm": "^0.45.x",
    "postgres": "^3.x",
    "firebase-admin": "^13.x",
    "zod": "^3.x",
    "@sudobility/myproject_types": "*",
    "@sudobility/auth_service": "*",
    "@sudobility/entity_service": "*",
    "@sudobility/ratelimit_service": "*",
    "@sudobility/subscription_service": "*"
  }
}
```

### Scripts

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir=dist --target=bun",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## Step 3: Create `{project}_client`

The client package provides typed HTTP methods and React Query hooks. It must be **platform-agnostic** (works in both web and React Native).

### Tech Stack

| Technology           | Purpose                           |
| -------------------- | --------------------------------- |
| **TanStack Query 5** | Data fetching, caching, mutations |
| **React 19**         | Peer dependency                   |
| **TypeScript**       | Type safety                       |

### Structure

```
myproject_client/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Public exports
│   ├── types.ts              # Query keys, client config types
│   ├── network/
│   │   ├── MyProjectClient.ts   # HTTP client class
│   │   └── errors.ts            # Custom error types
│   └── hooks/
│       ├── index.ts             # Hooks barrel export
│       ├── query-keys.ts        # Query key factory
│       ├── useProjects.ts       # Project hooks
│       └── ...                  # Domain-specific hooks
└── dist/
```

### HTTP Client Class Pattern

```typescript
// src/network/MyProjectClient.ts
import type { BaseResponse, Project, ProjectCreateRequest } from '@sudobility/myproject_types';

export interface MyProjectClientConfig {
  baseUrl: string;
  getIdToken: () => Promise<string | undefined>;
}

export class MyProjectClient {
  private baseUrl: string;
  private getIdToken: () => Promise<string | undefined>;

  constructor(config: MyProjectClientConfig) {
    this.baseUrl = config.baseUrl;
    this.getIdToken = config.getIdToken;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await this.getIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new MyProjectApiError(response.status, error.error || 'Request failed');
    }

    return response.json();
  }

  // Entity-scoped methods
  async getProjects(entitySlug: string): Promise<BaseResponse<Project[]>> {
    return this.request(`/api/v1/entities/${entitySlug}/projects`);
  }

  async createProject(
    entitySlug: string,
    data: ProjectCreateRequest
  ): Promise<BaseResponse<Project>> {
    return this.request(`/api/v1/entities/${entitySlug}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(entitySlug: string, projectId: string): Promise<BaseResponse<Project>> {
    return this.request(`/api/v1/entities/${entitySlug}/projects/${projectId}`, {
      method: 'DELETE',
    });
  }
}
```

### Query Keys Pattern

```typescript
// src/hooks/query-keys.ts
export const QUERY_KEYS = {
  projects: 'myproject-projects',
  project: 'myproject-project',
  analytics: 'myproject-analytics',
  settings: 'myproject-settings',
  subscription: 'myproject-subscription',
} as const;
```

### React Query Hook Pattern

```typescript
// src/hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MyProjectClient } from '../network/MyProjectClient';
import type { ProjectCreateRequest } from '@sudobility/myproject_types';
import { QUERY_KEYS } from './query-keys';

export function useProjects(client: MyProjectClient, entitySlug: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.projects, entitySlug],
    queryFn: () => client.getProjects(entitySlug),
    enabled: !!entitySlug,
  });
}

export function useCreateProject(client: MyProjectClient, entitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectCreateRequest) => client.createProject(entitySlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.projects, entitySlug],
      });
    },
  });
}

export function useDeleteProject(client: MyProjectClient, entitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => client.deleteProject(entitySlug, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.projects, entitySlug],
      });
    },
  });
}
```

### Key Points

- All hooks accept `client` and scope params (`entitySlug` or `userId`) as arguments
- Query keys include the scope to prevent cache collisions across entities
- Use `enabled: !!entitySlug` to prevent queries without required params
- Mutations invalidate relevant queries on success
- **No DOM or browser APIs** — this package runs on both web and React Native
- Test with Vitest in `node` environment (no DOM) to ensure platform agnosticism

### Key Dependencies

```json
{
  "peerDependencies": {
    "react": ">=18",
    "@tanstack/react-query": "^5.0.0",
    "@sudobility/myproject_types": "*"
  }
}
```

---

## Step 4: Create `{project}_lib`

The lib package sits between `client` (data fetching) and `app` (UI). It contains Zustand stores for local state and manager hooks that bridge query state to store state. It must be **platform-agnostic** (web + React Native).

### Tech Stack

| Technology           | Purpose                            |
| -------------------- | ---------------------------------- |
| **Zustand 5**        | Lightweight state management       |
| **TanStack Query 5** | Peer dependency (used by managers) |
| **React 19**         | Peer dependency                    |

### Structure

```
myproject_lib/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Public exports
│   ├── stores/
│   │   ├── index.ts          # Stores barrel export
│   │   ├── projectStore.ts   # Projects state
│   │   ├── settingsStore.ts  # User settings state
│   │   └── ...
│   ├── managers/
│   │   ├── index.ts          # Managers barrel export
│   │   ├── useProjectManager.ts
│   │   ├── useSettingsManager.ts
│   │   └── ...
│   ├── hooks/
│   │   ├── index.ts
│   │   └── useMyProjectClient.ts  # Client instantiation hook
│   └── utils/
│       └── resetAllStores.ts      # Reset all stores on logout
└── dist/
```

### Zustand Store Pattern

```typescript
// src/stores/projectStore.ts
import { create } from 'zustand';
import type { Project } from '@sudobility/myproject_types';

interface ProjectState {
  // State - keyed by entitySlug for multi-tenancy
  cache: Record<string, { projects: Project[]; cachedAt: number }>;

  // Actions
  setProjects: (entitySlug: string, projects: Project[]) => void;
  getProjects: (entitySlug: string) => Project[] | undefined;
  addProject: (entitySlug: string, project: Project) => void;
  updateProject: (entitySlug: string, projectId: string, project: Project) => void;
  removeProject: (entitySlug: string, projectId: string) => void;
  clearAll: () => void;
}

export const useProjectsStore = create<ProjectState>((set, get) => ({
  cache: {},

  setProjects: (entitySlug, projects) =>
    set(state => ({
      cache: {
        ...state.cache,
        [entitySlug]: { projects, cachedAt: Date.now() },
      },
    })),

  getProjects: entitySlug => get().cache[entitySlug]?.projects,

  addProject: (entitySlug, project) =>
    set(state => {
      const existing = state.cache[entitySlug]?.projects ?? [];
      return {
        cache: {
          ...state.cache,
          [entitySlug]: { projects: [...existing, project], cachedAt: Date.now() },
        },
      };
    }),

  removeProject: (entitySlug, projectId) =>
    set(state => {
      const existing = state.cache[entitySlug]?.projects ?? [];
      return {
        cache: {
          ...state.cache,
          [entitySlug]: {
            projects: existing.filter(p => p.uuid !== projectId),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  updateProject: (entitySlug, projectId, project) =>
    set(state => {
      const existing = state.cache[entitySlug]?.projects ?? [];
      return {
        cache: {
          ...state.cache,
          [entitySlug]: {
            projects: existing.map(p => (p.uuid === projectId ? project : p)),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  clearAll: () => set({ cache: {} }),
}));
```

### Manager Hook Pattern

Managers bridge TanStack Query (server state) with Zustand stores (client state):

```typescript
// src/managers/useProjectManager.ts
import { useEffect, useMemo } from 'react';
import { MyProjectClient } from '@sudobility/myproject_client';
import { useProjects, useCreateProject, useDeleteProject } from '@sudobility/myproject_client';
import { useProjectsStore } from '../stores/projectStore';

export interface UseProjectManagerConfig {
  baseUrl: string;
  getIdToken: () => Promise<string | undefined>;
  entitySlug: string;
}

export function useProjectManager(config: UseProjectManagerConfig) {
  const { baseUrl, getIdToken, entitySlug } = config;

  // Memoize client to prevent re-creation
  const client = useMemo(() => new MyProjectClient({ baseUrl, getIdToken }), [baseUrl, getIdToken]);

  // TanStack Query hooks
  const projectsQuery = useProjects(client, entitySlug);
  const createMutation = useCreateProject(client, entitySlug);
  const deleteMutation = useDeleteProject(client, entitySlug);

  // Store actions
  const { setProjects } = useProjectsStore();

  // Sync query data → store
  useEffect(() => {
    if (projectsQuery.data?.data) {
      setProjects(entitySlug, projectsQuery.data.data);
    }
  }, [projectsQuery.data, entitySlug, setProjects]);

  // Return unified interface
  return {
    projects: useProjectsStore(state => state.getProjects(entitySlug)) ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error?.message ?? null,
    createProject: createMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
    refetch: projectsQuery.refetch,
  };
}
```

### Reset All Stores on Logout

```typescript
// src/utils/resetAllStores.ts
import { useProjectsStore } from '../stores/projectStore';
import { useSettingsStore } from '../stores/settingsStore';

export function resetAllStores() {
  useProjectsStore.getState().clearAll();
  useSettingsStore.getState().clearAll();
  // Add all stores here
}
```

### Key Points

- Stores are **entity-keyed** (`Record<entitySlug, data>`) to support multi-tenancy
- Managers use `useEffect` to sync query data into stores
- Components read from stores (always has latest data)
- Mutations go through TanStack Query (which invalidates caches)
- Call `resetAllStores()` on user logout
- **No DOM or browser APIs** — test with `node` environment

---

## Step 5: Create `{project}_app` (Web)

The web app is a React SPA built with Vite.

### Tech Stack

| Technology          | Purpose                 |
| ------------------- | ----------------------- |
| **React 19**        | UI framework            |
| **Vite**            | Build tool              |
| **Tailwind CSS**    | Styling                 |
| **React Router v7** | Client-side routing     |
| **Firebase**        | Authentication          |
| **i18next**         | Internationalization    |
| **RevenueCat**      | Subscription management |

### Structure

```
myproject_app/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── .github/workflows/ci-cd.yml
├── public/
│   └── locales/              # i18n translation files
│       ├── en/
│       │   ├── common.json
│       │   ├── home.json
│       │   └── dashboard.json
│       ├── zh/
│       └── ...
├── src/
│   ├── main.tsx              # Entry point (async init)
│   ├── App.tsx               # Root component with routing
│   ├── i18n.ts               # i18next configuration
│   ├── index.css             # Global Tailwind styles
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── DocsPage.tsx
│   │   ├── PricingPageWrapper.tsx
│   │   ├── PrivacyPage.tsx
│   │   ├── TermsPage.tsx
│   │   ├── CookiesPage.tsx
│   │   ├── SitemapPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── use-cases/
│   │   │   └── UseCasesPage.tsx
│   │   └── dashboard/
│   │       ├── DashboardPage.tsx
│   │       ├── ProjectsPage.tsx
│   │       ├── SettingsPage.tsx
│   │       ├── AnalyticsPage.tsx
│   │       ├── SubscriptionPage.tsx
│   │       ├── RateLimitsPage.tsx
│   │       ├── WorkspacesPage.tsx
│   │       ├── MembersPage.tsx
│   │       └── InvitationsPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── LanguageRedirect.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── EntityRedirect.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── providers/
│   │   │   └── AuthProviderWrapper.tsx
│   │   └── ui/               # App-specific UI components
│   ├── hooks/
│   │   ├── useDocumentLanguage.ts
│   │   └── useLocalizedNavigate.ts
│   ├── config/
│   │   ├── constants.ts      # App constants from env vars
│   │   ├── initialize.ts     # App initialization
│   │   ├── auth-config.ts    # Auth UI configuration
│   │   ├── analytics.ts      # Analytics config
│   │   ├── seo-config.ts     # SEO metadata
│   │   └── subscription-config.ts
│   └── utils/
└── test/
```

### Entry Point Pattern

```typescript
// src/main.tsx
import { initializeI18n } from './i18n';

// Initialize i18n synchronously before React renders
initializeI18n();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### App.tsx Pattern

```typescript
// src/App.tsx
import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SudobilityAppWithFirebaseAuthAndEntities } from '@sudobility/building_blocks/firebase';
import { LanguageValidator } from '@sudobility/components';
import { isLanguageSupported, CONSTANTS } from './config/constants';
import i18n from './i18n';
import { useDocumentLanguage } from './hooks/useDocumentLanguage';
import { AuthProviderWrapper } from './components/providers/AuthProviderWrapper';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const PricingPageWrapper = lazy(() => import('./pages/PricingPageWrapper'));
// ... more lazy imports

const LanguageRedirect = lazy(() => import('./components/layout/LanguageRedirect'));
const ProtectedRoute = lazy(() => import('./components/layout/ProtectedRoute'));
const EntityRedirect = lazy(() => import('./components/layout/EntityRedirect'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-theme-bg-primary">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

function DocumentLanguageSync({ children }: { children: ReactNode }) {
  useDocumentLanguage();
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <DocumentLanguageSync>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Root: detect language and redirect */}
          <Route path="/" element={<LanguageRedirect />} />

          {/* All routes under /:lang */}
          <Route
            path="/:lang"
            element={
              <LanguageValidator
                isLanguageSupported={isLanguageSupported}
                defaultLanguage="en"
                storageKey="language"
              />
            }
          >
            {/* Public pages */}
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="pricing" element={<PricingPageWrapper />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Dashboard redirect → picks default entity */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <EntityRedirect />
                </ProtectedRoute>
              }
            />

            {/* Protected dashboard with entity */}
            <Route
              path="dashboard/:entitySlug"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProjectsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="settings" element={<DashboardSettingsPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="rate-limits" element={<RateLimitsPage />} />
              <Route path="workspaces" element={<WorkspacesPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
            </Route>

            {/* Catch-all within language */}
            <Route path="*" element={<Navigate to="." replace />} />
          </Route>

          {/* Catch-all without language */}
          <Route path="*" element={<LanguageRedirect />} />
        </Routes>
      </Suspense>
    </DocumentLanguageSync>
  );
}

function App() {
  return (
    <SudobilityAppWithFirebaseAuthAndEntities
      i18n={i18n}
      apiUrl={CONSTANTS.API_URL}
      testMode={CONSTANTS.DEV_MODE}
      revenueCatApiKey={CONSTANTS.REVENUECAT_API_KEY}
      revenueCatApiKeySandbox={CONSTANTS.REVENUECAT_API_KEY_SANDBOX}
      AuthProviderWrapper={AuthProviderWrapper}
    >
      <AppRoutes />
    </SudobilityAppWithFirebaseAuthAndEntities>
  );
}

export default App;
```

### Constants Pattern

```typescript
// src/config/constants.ts
export const SUPPORTED_LANGUAGES = [
  'en',
  'ar',
  'de',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pt',
  'ru',
  'sv',
  'th',
  'uk',
  'vi',
  'zh',
  'zh-hant',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const isLanguageSupported = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

export const CONSTANTS = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'MyProject',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
  REVENUECAT_API_KEY: import.meta.env.VITE_REVENUECAT_API_KEY || '',
  REVENUECAT_API_KEY_SANDBOX: import.meta.env.VITE_REVENUECAT_API_KEY_SANDBOX || '',
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || '',
  // Social links
  SOCIAL_LINKS: {
    twitter: import.meta.env.VITE_TWITTER_URL || '',
    discord: import.meta.env.VITE_DISCORD_URL || '',
    github: import.meta.env.VITE_GITHUB_URL || '',
  },
};
```

### Vite Config Pattern

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-tanstack': ['@tanstack/react-query'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
  },
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-helmet-async',
      'zustand',
      '@tanstack/react-query',
      'firebase',
    ],
  },
});
```

### Key Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "firebase": "^12.0.0",
    "@revenuecat/purchases-js": "^1.0.0",
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0",
    "i18next-http-backend": "^3.0.0",
    "i18next-browser-languagedetector": "^8.0.0",
    "react-helmet-async": "^2.0.0",
    "recharts": "^3.0.0",
    "@sudobility/myproject_client": "*",
    "@sudobility/myproject_lib": "*",
    "@sudobility/myproject_types": "*",
    "@sudobility/building_blocks": "*",
    "@sudobility/components": "*",
    "@sudobility/design": "*",
    "@sudobility/di_web": "*",
    "@sudobility/entity_client": "*",
    "@sudobility/entity_pages": "*",
    "@sudobility/ratelimit_client": "*",
    "@sudobility/ratelimit_pages": "*",
    "@sudobility/subscription-components": "*",
    "@sudobility/auth-components": "*",
    "@sudobility/auth_lib": "*"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "@vitejs/plugin-react": "*",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.9.0",
    "vitest": "*"
  }
}
```

### Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "test": "vitest",
    "test:run": "vitest run",
    "format": "prettier --write src/",
    "localize": "bun run localize-script",
    "analyze:bundle": "vite-bundle-visualizer"
  }
}
```

---

## Step 6: Create `{project}_app_rn` (React Native, optional)

The React Native app shares `{project}_client`, `{project}_lib`, and `{project}_types` with the web app. Only the UI layer differs.

### Key Differences from Web App

| Concern     | Web                           | React Native                     |
| ----------- | ----------------------------- | -------------------------------- |
| Build tool  | Vite                          | Metro/Expo                       |
| Routing     | React Router                  | React Navigation                 |
| Styling     | Tailwind CSS                  | React Native StyleSheet          |
| App wrapper | `@sudobility/building_blocks` | `@sudobility/building_blocks_rn` |
| DI          | `@sudobility/di_web`          | `@sudobility/di_rn`              |
| Components  | `@sudobility/components`      | `@sudobility/components_rn`      |

### Shared Code

```
{project}_types   → Shared ✅ (universal)
{project}_client  → Shared ✅ (no DOM APIs)
{project}_lib     → Shared ✅ (no DOM APIs)
{project}_app     → Web only ❌
{project}_app_rn  → RN only ❌
```

This is why `client` and `lib` must never import DOM APIs or browser-specific code.

---

## Firebase Setup

Every frontend app needs a Firebase project for authentication.

### Steps

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com)
2. **Enable Authentication** → Sign-in methods (Email/Password, Google, Apple, etc.)
3. **Add a Web App** in Project Settings → get the Firebase config values
4. **Create a Service Account** → download the private key JSON for the API server
5. **Set environment variables** for both `{project}_api` and `{project}_app`

### API Server (Firebase Admin)

```env
FIREBASE_PROJECT_ID=myproject-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@myproject-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Web App (Firebase Client)

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=myproject-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=myproject-12345
VITE_FIREBASE_STORAGE_BUCKET=myproject-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Environment Variables

### Web App (`.env.example`)

```env
# =============================================================================
# Firebase
# =============================================================================
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# =============================================================================
# RevenueCat (Subscriptions)
# =============================================================================
VITE_REVENUECAT_API_KEY=
VITE_REVENUECAT_API_KEY_SANDBOX=
VITE_REVENUECAT_OFFER_ID=

# =============================================================================
# API
# =============================================================================
VITE_API_URL=http://localhost:3000

# =============================================================================
# Branding
# =============================================================================
VITE_APP_NAME=MyProject
VITE_APP_DOMAIN=myproject.com
VITE_COMPANY_NAME=Sudobility
VITE_SUPPORT_EMAIL=support@myproject.com

# =============================================================================
# Social Links
# =============================================================================
VITE_TWITTER_URL=
VITE_TWITTER_HANDLE=
VITE_DISCORD_URL=
VITE_DISCORD_INVITE=
VITE_GITHUB_URL=
VITE_GITHUB_ORG=
VITE_LINKEDIN_URL=
VITE_LINKEDIN_COMPANY=
VITE_REDDIT_URL=
VITE_FARCASTER_URL=
VITE_TELEGRAM_URL=
VITE_STATUS_PAGE_URL=
VITE_MEET_FOUNDER_URL=

# =============================================================================
# Feature Flags
# =============================================================================
VITE_DEV_MODE=false
VITE_SHOW_PERFORMANCE_MONITOR=false
```

### API Server (`.env.example`)

```env
DATABASE_URL=postgres://user:password@localhost:5432/myproject
PORT=3000

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

REVENUECAT_API_KEY=
SITEADMIN_EMAILS=admin@example.com

TRANSLATION_SERVICE_URL=http://localhost:8000/translate
```

### Important

- Web apps use the `VITE_` prefix (Vite exposes these to the client)
- API servers use plain env vars (never expose secrets to the client)
- Copy `.env.example` to `.env.local` for local development
- Never commit `.env.local` to git

---

## CI/CD with GitHub Actions

All packages use the unified CI/CD workflow from `johnqh/workflows`.

### API Server Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci-cd:
    uses: johnqh/workflows/.github/workflows/unified-cicd.yml@main
    with:
      docker-image-name: myproject_api
      skip-npm-publish: true
    secrets: inherit
```

### Web App Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci-cd:
    uses: johnqh/workflows/.github/workflows/unified-cicd.yml@main
    with:
      skip-npm-publish: true
    secrets: inherit
```

### npm Library Workflow (types, client, lib)

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci-cd:
    uses: johnqh/workflows/.github/workflows/unified-cicd.yml@main
    secrets: inherit
```

### What the Unified Workflow Does

- Runs `typecheck`, `lint`, `test:run` on PRs and pushes
- Publishes npm packages on main (for libraries)
- Builds and pushes Docker images on main (for API servers)
- Deployment via Cloudflare Pages for web apps (configured separately)

---

## LLM Integration via ShapeShyft

For any project that needs LLM capabilities (structured output, classification, summarization, etc.), use **ShapeShyft** (shapeshyft.ai) as the LLM gateway.

### How It Works

1. Create a project and endpoint on ShapeShyft
2. Configure the LLM provider, model, system prompt, and output schema
3. Call the ShapeShyft public API from your backend

### API Call Pattern

```typescript
// In your API server
const response = await fetch(
  `https://api.shapeshyft.ai/api/v1/ai/${orgPath}/${projectName}/${endpointName}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SHAPESHYFT_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: 'Classify this text: ...',
      // or pass structured input matching your endpoint config
    }),
  }
);

const result = await response.json();
// result.data contains structured JSON output matching your schema
```

### Benefits

- No need to manage LLM provider API keys per project
- Centralized endpoint configuration (model, prompt, schema)
- Built-in analytics and cost tracking
- Support for 10+ LLM providers (OpenAI, Anthropic, Gemini, etc.)

---

## Common Patterns

### Entity-Centric Multi-Tenancy

All resources are scoped to **entities** (organizations), not individual users.

```
User → belongs to → Entity (organization)
Project → belongs to → Entity
API Keys → belongs to → Entity
Analytics → belongs to → Entity
```

API routes follow the pattern: `/api/v1/entities/:entitySlug/resources`

The dashboard URL follows: `/:lang/dashboard/:entitySlug/page`

### State Management Hierarchy

| Layer            | Tool           | Use Case                                 |
| ---------------- | -------------- | ---------------------------------------- |
| Server state     | TanStack Query | API data, caching, background refetch    |
| Client state     | Zustand stores | Cached data, UI selections, filters      |
| Business logic   | Manager hooks  | Bridge query → store, expose unified API |
| User preferences | React Context  | Theme, settings                          |
| Local/UI state   | `useState`     | Form inputs, toggles, modals             |

### Response Format

All API responses use a consistent wrapper:

```typescript
// Success
{
  success: true,
  data: { ... },
  timestamp: "2025-01-01T00:00:00.000Z"
}

// Error
{
  success: false,
  error: "Error message",
  timestamp: "2025-01-01T00:00:00.000Z"
}
```

Use the helpers from `@sudobility/types`:

```typescript
import { successResponse, errorResponse } from '@sudobility/types';

return c.json(successResponse(data));
return c.json(errorResponse('Not found'), 404);
```

### Protected Routes

```tsx
<Route
  path="dashboard/:entitySlug"
  element={
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  }
>
  {/* Child routes */}
</Route>
```

### Lazy Loading Pages

All pages are lazy-loaded for performance:

```tsx
const ProjectsPage = lazy(() => import('./pages/dashboard/ProjectsPage'));
```

### Standard Pages

Every web app should include:

| Page                 | Path                                  | Description                                                |
| -------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Home                 | `/`                                   | Landing page                                               |
| Login                | `/login`                              | Authentication                                             |
| Pricing              | `/pricing`                            | Pricing tiers (uses `@sudobility/subscription-components`) |
| Docs                 | `/docs`                               | Documentation                                              |
| Settings             | `/settings`                           | App-level settings (theme, language, font size)            |
| Privacy              | `/privacy`                            | Privacy policy                                             |
| Terms                | `/terms`                              | Terms of service                                           |
| Cookies              | `/cookies`                            | Cookie policy                                              |
| Sitemap              | `/sitemap`                            | Sitemap                                                    |
| Dashboard            | `/dashboard/:entitySlug`              | Protected dashboard                                        |
| Subscription         | `/dashboard/:entitySlug/subscription` | Subscription management                                    |
| Rate Limits          | `/dashboard/:entitySlug/rate-limits`  | Rate limit status                                          |
| Workspaces           | `/dashboard/:entitySlug/workspaces`   | Entity management                                          |
| Members              | `/dashboard/:entitySlug/members`      | Member management                                          |
| Invitations          | `/dashboard/:entitySlug/invitations`  | Invitation management                                      |
| Settings (Dashboard) | `/dashboard/:entitySlug/settings`     | Entity settings                                            |

---

## Localization

All apps support 16 languages using i18next with URL path-based routing.

See the detailed [Localization Guide](../../../0xmail/building_blocks/docs/LOCALIZATION.md) for full setup instructions.

### Quick Summary

1. Define `SUPPORTED_LANGUAGES` in `src/config/constants.ts`
2. Create `src/i18n.ts` with i18next configuration
3. Pass `i18n={i18n}` to `SudobilityApp` (required prop)
4. Set up routes with `LanguageRedirect` at `/` and `LanguageValidator` at `/:lang`
5. Use `useDocumentLanguage()` hook to sync `<html lang>` and `dir`
6. Create translation JSON files in `public/locales/{lang}/{namespace}.json`
7. Use `useTranslation()` in components

### Supported Languages

```
en, ar, de, es, fr, it, ja, ko, pt, ru, sv, th, uk, vi, zh, zh-hant
```

---

## Subscriptions & Rate Limiting

### RevenueCat Setup

1. Create a RevenueCat project at [app.revenuecat.com](https://app.revenuecat.com)
2. Configure products/offerings
3. Set `VITE_REVENUECAT_API_KEY` and `VITE_REVENUECAT_API_KEY_SANDBOX` in the web app
4. Set `REVENUECAT_API_KEY` in the API server
5. Use `@sudobility/subscription-components` for paywall UI
6. Use `@sudobility/subscription_service` for server-side verification

### Rate Limiting

- Uses `@sudobility/ratelimit_service` on the API server
- Per-entity rate limits based on subscription tier
- Use `@sudobility/ratelimit_pages` for the rate limit dashboard UI
- Site admins (listed in `SITEADMIN_EMAILS`) bypass rate limits

---

## Checklist

Use this checklist when starting a new project:

### Setup

- [ ] Create `{project}_types` package with shared types
- [ ] Create `{project}_api` with Hono + Drizzle + PostgreSQL
- [ ] Create `{project}_client` with TanStack Query hooks
- [ ] Create `{project}_lib` with Zustand stores and manager hooks
- [ ] Create `{project}_app` with React + Vite + Tailwind

### Firebase

- [ ] Create Firebase project
- [ ] Enable authentication providers (Email, Google, Apple)
- [ ] Create service account for API server
- [ ] Set Firebase env vars in both API and App

### Environment

- [ ] Create `.env.example` for API
- [ ] Create `.env.example` for App
- [ ] Create `.env.local` files (not committed to git)
- [ ] Set up branding env vars (app name, domain, social links)

### CI/CD

- [ ] Add `.github/workflows/ci-cd.yml` to each package
- [ ] Configure `johnqh/workflows` unified workflow
- [ ] Set up Cloudflare Pages for web app deployment
- [ ] Set up Docker Hub for API deployment

### Features

- [ ] Set up i18n with 16 languages
- [ ] Configure RevenueCat for subscriptions
- [ ] Add rate limiting on API endpoints
- [ ] Set up entity-based multi-tenancy
- [ ] Add standard pages (home, login, pricing, docs, privacy, terms, etc.)

### LLM (if needed)

- [ ] Create ShapeShyft project and endpoints
- [ ] Configure LLM provider and model
- [ ] Integrate ShapeShyft API in your backend
