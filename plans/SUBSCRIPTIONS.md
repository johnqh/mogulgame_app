# Subscription Pages Implementation Plan

## Context

The current subscription UI lives inside `building_blocks` (web) and `building_blocks_rn` (RN) as tightly coupled components. The subscription_lib only supports fetching a single offering at a time, which is limiting for apps with multiple subscription tiers/offerings. This plan creates dedicated `subscription_pages` and `subscription_pages_rn` packages (following the `entity_pages` pattern), and extends `subscription_lib` with multi-offering hooks.

## Scope: 3 Packages

1. **subscription_lib** -- add 3 new hooks + 1 service method, deprecate old single-offering hooks
2. **subscription_pages** -- new web pages library (2 page components)
3. **subscription_pages_rn** -- new RN pages library (2 page components)

## Implementation Order

**Phase 1: subscription_lib** (must be first -- downstream packages depend on new hooks)
**Phase 2: subscription_pages + subscription_pages_rn** (can be parallel)

---

## Phase 1: subscription_lib Changes

### 1.1 Add `getAllOffers()` to SubscriptionService

**File:** `subscription_lib/src/core/service.ts`

Add after existing `getOfferIds()` method:

```typescript
getAllOffers(): SubscriptionOffer[] {
  return Array.from(this.offersCache.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, offer]) => offer);
}
```

### 1.2 New Hook: `useAllOfferings()`

**New file:** `subscription_lib/src/hooks/useAllOfferings.ts`

```typescript
export interface UseAllOfferingsResult {
  offerings: SubscriptionOffer[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAllOfferings(): UseAllOfferingsResult;
```

- Follows `useSubscriptions` pattern (useState + useEffect + useCallback)
- Calls `service.loadOfferings()` then `service.getAllOffers()`
- Does not reload on user change (offerings are user-independent)

### 1.3 New Hook: `useOfferingPackages(offerId)`

**New file:** `subscription_lib/src/hooks/useOfferingPackages.ts`

```typescript
export interface UseOfferingPackagesResult {
  packages: SubscriptionPackage[];
  isLoading: boolean;
  error: Error | null;
}

export function useOfferingPackages(offerId: string): UseOfferingPackagesResult;
```

- Uses `useAllOfferings()` internally
- Filters for specific offerId, sorts packages by `getPeriodRank(pkg.product.period)` ascending

### 1.4 New Hook: `usePackagesByDuration()`

**New file:** `subscription_lib/src/hooks/usePackagesByDuration.ts`

```typescript
export interface PackageWithOffer {
  package: SubscriptionPackage;
  offerId: string;
  offerMetadata?: Record<string, unknown>;
}

export interface UsePackagesByDurationResult {
  packagesByDuration: Record<SubscriptionPeriod, PackageWithOffer[]>;
  availableDurations: SubscriptionPeriod[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePackagesByDuration(): UsePackagesByDurationResult;
```

- Uses `useAllOfferings()` internally
- Groups all packages from all offerings by `package.product.period`
- Each entry carries `offerId` (needed for `purchase()` which requires `offeringId`)
- Within each duration group, sorted by offer identifier
- `availableDurations` sorted using `ALL_PERIODS` from `@sudobility/types`
- `PackageWithOffer` wrapper needed because `SubscriptionPackage` doesn't carry its parent `offerId`

### 1.5 Deprecate Existing Hooks

Add `@deprecated` JSDoc to:

- `useSubscriptions` -- "Use useAllOfferings() or useOfferingPackages() instead"
- `useSubscriptionPeriods` -- "Use usePackagesByDuration() instead"
- `useSubscriptionForPeriod` -- "Use usePackagesByDuration() instead"
- `useSubscribable` -- "Use usePackagesByDuration() with useUserSubscription() instead"

**NOT deprecated:** `useUserSubscription`, `useEntitlements` (still needed)

### 1.6 Update Barrel Exports

**Files:** `subscription_lib/src/hooks/index.ts` and `subscription_lib/src/index.ts`

Add exports: `useAllOfferings`, `useOfferingPackages`, `usePackagesByDuration`, `PackageWithOffer`, and all result types.

### 1.7 Tests

**New files:**

- `subscription_lib/src/hooks/useAllOfferings.test.ts`
- `subscription_lib/src/hooks/useOfferingPackages.test.ts`
- `subscription_lib/src/hooks/usePackagesByDuration.test.ts`

Mock singleton + service. Test: loading, error, empty, populated, sort order, grouping correctness.

---

## Phase 2: subscription_pages (Web)

### 2.1 Project Setup

**Location:** `/Users/johnhuang/projects/subscription_pages`

Following entity_pages template exactly:

```
subscription_pages/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json              # Copy from entity_pages
├── vite.config.ts             # Copy from entity_pages, adjust externals
├── eslint.config.js           # Copy from entity_pages
└── src/
    ├── index.ts
    └── pages/
        ├── index.ts
        ├── SubscriptionByDurationPage.tsx
        ├── SubscriptionByDurationPage.test.tsx
        ├── SubscriptionByOfferPage.tsx
        ├── SubscriptionByOfferPage.test.tsx
        └── index.test.ts
```

### 2.2 package.json

```json
{
  "name": "@sudobility/subscription_pages",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@sudobility/subscription_lib": "^0.0.25",
    "@sudobility/subscription-components": "^1.0.27",
    "@sudobility/types": "^1.9.58"
  }
}
```

### 2.3 vite.config.ts

Externals: `react`, `react-dom`, `react/jsx-runtime`, `@sudobility/subscription_lib`, `@sudobility/subscription-components`, `@sudobility/types`

### 2.4 SubscriptionByDurationPage

**Props:**

```typescript
export interface SubscriptionByDurationPageProps {
  isLoggedIn: boolean;
  onNavigateToLogin: () => void;
  userId?: string;
  userEmail?: string;
  featuresByPackage?: Record<string, string[]>;
  freeFeatures?: string[];
  title?: string;
  className?: string;
}
```

**Hooks used:**

- `usePackagesByDuration()` -- grouped data + available durations
- `useUserSubscription({ userId, userEmail })` -- current subscription

**Local state:**

- `selectedDuration: SubscriptionPeriod` (defaults to first available)
- `purchaseError: string | null`

**UI structure:**

- `SubscriptionLayout` (variant="cta") with `currentStatus` if user has subscription
- `SegmentedControl` in `aboveProducts` for duration tabs
- Free tile via `freeTileConfig` on SubscriptionLayout
- `SubscriptionTile` per package in `packagesByDuration[selectedDuration]`

**CTA logic (core of both pages):**

| State                                   | Free Tile CTA                         | Paid Tile CTA                            |
| --------------------------------------- | ------------------------------------- | ---------------------------------------- |
| Not logged in                           | "Try it for Free" → onNavigateToLogin | "Log in to Continue" → onNavigateToLogin |
| Logged in, no sub                       | Selected (Current Plan), no CTA       | "Subscribe" → purchase()                 |
| Logged in, has sub, this is current     | Selected (Current Plan), no CTA       | --                                       |
| Logged in, has sub, this is NOT current | "Cancel Subscription" → managementUrl | "Change Subscription" → purchase()       |

**handlePurchase:**

```typescript
const service = getSubscriptionInstance();
await service.purchase({ packageId, offeringId, customerEmail });
await refreshSubscription();
```

### 2.5 SubscriptionByOfferPage

**Props:**

```typescript
export interface SubscriptionByOfferPageProps {
  isLoggedIn: boolean;
  onNavigateToLogin: () => void;
  userId?: string;
  userEmail?: string;
  featuresByPackage?: Record<string, string[]>;
  freeFeatures?: string[];
  title?: string;
  className?: string;
}
```

**Hooks used:**

- `useAllOfferings()` -- all offerings for segmented control
- `useOfferingPackages(selectedOfferId)` -- packages for selected offering
- `useUserSubscription({ userId, userEmail })` -- current subscription

**Local state:**

- `selectedSegment: 'free' | string` (offerId)

**UI structure:**

- `SegmentedControl` options: `[{ value: 'free', label: 'Free' }, ...offerings]`
- When 'free' selected: single Free tile
- When offering selected: duration tiles for that offering (sorted by period)
- Same CTA logic as SubscriptionByDurationPage

### 2.6 Tests

Mock `@sudobility/subscription_lib` hooks and `@sudobility/subscription-components`.
Test states: loading, error, not-logged-in CTAs, logged-in-no-sub, logged-in-with-sub, purchase flow, cancel flow.

---

## Phase 3: subscription_pages_rn (React Native)

### 3.1 Project Setup

**Location:** `/Users/johnhuang/projects/subscription_pages_rn`

Following entity_pages_rn template:

```
subscription_pages_rn/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json              # Copy from entity_pages_rn
├── tsconfig.build.json        # Copy from entity_pages_rn
└── src/
    ├── index.ts
    └── pages/
        ├── index.ts
        ├── SubscriptionByDurationPage.tsx
        └── SubscriptionByOfferPage.tsx
```

### 3.2 package.json

```json
{
  "name": "@sudobility/subscription_pages_rn",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "react": ">=18",
    "react-native": ">=0.74",
    "@sudobility/subscription_lib": "^0.0.25",
    "@sudobility/subscription-components-rn": "^1.0.0",
    "@sudobility/types": "^1.9.58"
  }
}
```

### 3.3 SubscriptionByDurationPage (RN)

**Props** (no isLoggedIn/onNavigateToLogin -- RN user is always logged in):

```typescript
export interface SubscriptionByDurationPageProps {
  userId: string;
  userEmail?: string;
  featuresByPackage?: Record<string, string[]>;
  freeFeatures?: string[];
  title?: string;
}
```

**Key differences from web:**

- No "not logged in" state
- Uses RN `SubscriptionTile` (takes `product: SubscriptionProduct` prop -- requires mapping from subscription_lib types)
- Uses `Linking.openURL(managementUrl)` for cancel
- Uses `SubscriptionLayout` with `headerContent` for SegmentedControl
- Uses `SubscriptionFooter` for restore purchases

**Mapping function** (local utility in each page):

```typescript
function mapToRnProduct(
  pkg: SubscriptionPackage,
  features: string[],
  isCurrent: boolean
): RnSubscriptionProduct;
```

### 3.4 SubscriptionByOfferPage (RN)

Same as web version but without login states, using RN components.

---

## Key Design Decisions

1. **PackageWithOffer wrapper** -- `purchase()` requires both `packageId` and `offeringId`. `SubscriptionPackage` doesn't carry `offerId`, so `PackageWithOffer` wraps them together. This avoids a breaking change to `SubscriptionPackage`.

2. **Two separate page components** (not one with a prop) -- cleaner separation, consuming app picks which to render.

3. **Callback prop for login** (`onNavigateToLogin`) -- follows entity_pages pattern of callbacks for navigation.

4. **Cancel opens managementUrl** -- RevenueCat standard pattern, redirects to App Store/Play Store/Stripe portal.

5. **Subscribe and Change both call `purchase()`** -- RevenueCat/store handles proration for changes.

6. **Free tier synthesis** -- Free tier comes from `service.getFreeTierPackage()`, not from RevenueCat offerings. Pages add it as a special tile.

## Verification

### subscription_lib

```bash
cd subscription_lib
bun test                    # New hook tests pass
bun run typecheck           # No type errors
bun run lint                # Clean
bun run build               # Builds successfully
```

### subscription_pages

```bash
cd subscription_pages
bun install
bun test                    # Page component tests pass
bun run type-check          # No type errors (note: hyphenated)
bun run lint                # Clean
bun run build               # Vite library build succeeds
```

### subscription_pages_rn

```bash
cd subscription_pages_rn
bun install
bun run typecheck           # No type errors
bun run build               # tsc build succeeds
```
