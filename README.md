# @sudobility/starter_app

Web application for the Starter project. Built with React 19, Vite 6, and Tailwind CSS.

## Setup

```bash
bun install
cp .env.example .env   # Configure environment variables
```

### Environment Variables

| Variable                    | Description          | Default                 |
| --------------------------- | -------------------- | ----------------------- |
| `VITE_API_URL`              | Backend API URL      | `http://localhost:8022` |
| `VITE_FIREBASE_API_KEY`     | Firebase API key     | required                |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | required                |
| `VITE_FIREBASE_PROJECT_ID`  | Firebase project ID  | required                |
| `VITE_APP_NAME`             | Application name     | `Starter`               |
| `VITE_APP_DOMAIN`           | Application domain   | `localhost`             |

## Running

```bash
bun run dev            # Start Vite dev server
bun run build          # TypeScript check + Vite production build
bun run preview        # Preview production build
```

## Features

- **i18n**: 16 languages with RTL support (Arabic). Language-prefixed routes (`/:lang/*`).
- **Auth**: Firebase Auth with protected routes.
- **Theming**: Light/dark theme switching via ThemeContext.
- **Code splitting**: Lazy-loaded pages with React Suspense.
- **Shared UI**: Uses `@sudobility/building_blocks` for TopBar, LoginPage, SettingsPage.

## Pages

- Home, Login, Histories, History Detail, Settings, Docs, Sitemap

## Development

```bash
bun run dev            # Vite dev server
bun run build          # TypeScript check + Vite build
bun run preview        # Preview production build
bun run typecheck      # TypeScript check
bun run lint           # ESLint
bun run format         # Prettier
bun run verify         # typecheck + lint + format:check
```

## Related Packages

- **starter_types** -- Shared type definitions
- **starter_client** -- API client SDK with TanStack Query hooks
- **starter_lib** -- Business logic library (`useHistoriesManager`)
- **starter_api** -- Backend server (default port 8022)
- **starter_app_rn** -- React Native counterpart of this web app

## License

BUSL-1.1
