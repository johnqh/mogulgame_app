# Improvement Plans for @sudobility/starter_app

## Priority 1 - High Impact

### 1. Add a Test Suite

- The CLAUDE.md explicitly states "There is no test suite currently -- the project relies on TypeScript type checking and manual testing"
- No component tests exist for any page (HomePage, HistoriesPage, HistoryDetailPage, SettingsPage, etc.)
- Critical user flows lack automated verification: history creation form submission, history deletion with navigation, loading/error states, unauthenticated redirect behavior
- At minimum, add Vitest with React Testing Library for key pages (HistoriesPage, HistoryDetailPage) and the ProtectedRoute component

### 2. Add Error Boundary Components ✅

- ~~No error boundaries exist in the component tree -- a runtime error in any lazy-loaded page will crash the entire application~~
- ~~The `handleSubmit` function in HistoriesPage.tsx and `handleDelete` in HistoryDetailPage.tsx have no try-catch error handling -- a failed API call will result in an unhandled promise rejection~~
- ~~The `LoadingFallback` component in App.tsx handles Suspense loading but there is no equivalent for error states~~
- ~~Add error boundaries at the route level (wrapping each lazy-loaded page) and at the application root~~
- **Done**: Created `ErrorBoundary` component with retry support. Added root-level error boundary in `AppRoutes` and route-level boundaries around `HistoriesPage` and `HistoryDetailPage`. Added try-catch with error state to both `handleSubmit` and `handleDelete`.

### 3. Fix API URL Port Mismatch Default ✅

- ~~`constants.ts` defaults `API_URL` to `http://localhost:3001` but the API server runs on port `8022`~~
- ~~This mismatch is documented in both the CLAUDE.md for starter_app and starter_api but remains a source of confusion~~
- The RN app's `env.ts` defaults to `localhost:3001` as well, compounding the issue
- ~~Both defaults should be aligned with the actual API port, or the default should be removed entirely to force explicit configuration~~
- **Done**: Changed default in `constants.ts` from `localhost:3001` to `localhost:8022`. RN app (`starter_app_rn`) is a separate project and should be updated there.

## Priority 2 - Medium Impact

### 3. Add Form Validation and User Feedback ✅

- ~~HistoriesPage.tsx's `handleSubmit` only checks `if (!datetime || !value)` before submitting -- no validation for negative values, zero values, or invalid date formats~~
- ~~No loading indicator is shown during form submission (the `isLoading` state covers initial data fetch but not the mutation in progress)~~
- ~~No success feedback after creating a history entry -- the form silently closes~~
- ~~HistoryDetailPage.tsx's `handleDelete` has no confirmation dialog before deleting -- unlike the React Native counterpart which uses `Alert.alert` with confirmation~~
- ~~Consider adding form validation, mutation loading states, success toasts, and delete confirmation~~
- **Done**: Added numeric value validation (positive, non-NaN) and date parsing validation. Added `isSubmitting` state with disabled button and loading text during form submission. Added inline delete confirmation flow in `HistoryDetailPage` with confirm/cancel buttons and `isDeleting` state. Submit errors are displayed via `role="alert"`.

### 4. Add Accessibility Improvements ✅

- ~~The loading spinner uses a generic `div` with `animate-spin` class and no ARIA attributes (no `role="status"`, no `aria-label`)~~
- ~~Form inputs in HistoriesPage.tsx lack `aria-describedby` attributes linking them to validation messages~~
- ~~The error display in HistoriesPage.tsx is a plain `div` without `role="alert"` for screen reader announcements~~
- RTL language support is mentioned (Arabic) but no RTL-specific styling or testing appears to exist beyond i18next configuration
- **Done**: Added `role="status"` and `aria-label` to all loading spinners (App.tsx, HistoriesPage, HistoryDetailPage, LoginPage). Added `role="alert"` to all error displays. Added `htmlFor`/`id` pairs linking labels to inputs. Added `aria-required`, `aria-expanded`, `aria-controls`, `aria-busy`, `aria-selected` attributes. Added `role="alert"` to Firebase error state. Added `aria-label` to footer nav, docs sidebar, stats region, and history list. Added tab/tablist/tabpanel roles to DocsPage.

## Priority 3 - Nice to Have

### 5. Add Loading Skeletons Instead of Spinners

- Both HistoriesPage and HistoryDetailPage show a simple spinning circle during loading
- Skeleton loading states that match the layout of the expected content would reduce perceived load time and prevent layout shifts
- The stats grid (Your Total, Global Total, Percentage) and the history list items are good candidates for skeleton placeholders

### 6. Extract Duplicated Calculation Logic ✅

- ~~HistoriesPage.tsx calculates `histories.reduce((sum, h) => sum + h.value, 0)` directly in JSX, duplicating the same calculation that `useHistoriesManager` performs internally for the percentage~~
- The `userTotal` could be exposed as a dedicated field from `useHistoriesManager` in starter_lib to avoid this redundancy
- ~~Date formatting (`new Date(history.datetime).toLocaleString()`) is repeated across multiple components with no consistent formatting utility~~
- **Done**: Extracted the inline `histories.reduce(...)` into a `useMemo`-wrapped `userTotal` variable. Created `src/utils/formatDateTime.ts` utility using `Intl.DateTimeFormat` for locale-aware formatting. Replaced all `new Date(...).toLocaleString()` calls in HistoriesPage and HistoryDetailPage with `formatDateTime()`.

## Additional Improvements Completed

### JSDoc Documentation ✅

- Added JSDoc comments to all exported components, hooks, utility functions, and configuration files across the entire codebase.

### Verify Script ✅

- Added `bun run verify` script to `package.json` that runs typecheck, lint, and format:check in sequence.
