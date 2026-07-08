# Skip RealtyAPI refresh for crawler requests

**Date:** 2026-07-08
**Status:** Approved, pending implementation
**Repos touched:** `mogulgame_types`, `mogulgame_api`, `mogulgame_client`, `mogulgame_app`

## Problem

`GET /api/v1/properties/:id` refreshes its cache from RealtyAPI whenever
`isCacheExpired(property.cached_at)` is true (`mogulgame_api/src/routes/properties.ts:372`).
The cache expires daily (`src/services/realty/cache.ts:4`).

`/:lang/properties/:id` is neither prerendered nor in the sitemap, so it is served as the SPA
shell. Googlebot executes the React bundle, which calls `GET /api/v1/properties/:id`, which
fires `realtyFetch`. Property pages are discovered by following real anchors — `PopularPage.tsx:178`,
`HomePage.tsx:211`, `MyFavoritesPage.tsx:191` all render `<Link to={`/properties/${id}`}>`.

Result: every crawl of every property page burns a RealtyAPI call.

Only JS-executing crawlers can trigger this. GPTBot, ClaudeBot, `facebookexternalhit`, and most
of bingbot never run the bundle and so never reach the API. In practice this is a Googlebot problem.

Two side effects ride along on the same request and are equally undesirable when the caller is a bot:

- `resolvePropertyOffers` may fire (`properties.ts:419`) — a write path triggered by a crawl.
- `property_views` is upserted (`properties.ts:442`), which feeds `GET /views/popular`, the
  ranking behind PopularPage. **Googlebot is currently inflating popularity rankings.**

## Decisions

Property detail pages **must stay indexable**, so blocking the crawl via `robots.txt` is rejected.
The crawl must instead be made cheap.

The flag is scoped as **"a read with no side effects"** rather than narrowly "skip the upstream
call", and is named for its cause (`crawler`) rather than one of its effects. This keeps the name
honest as more side effects accrete on the read path.

Detection happens in **both** places: the client sets an explicit param, and the API independently
sniffs the `User-Agent`. The param is the contract; the UA check is defense-in-depth covering
`mogulgame_app_rn`, clients pinned to older published packages, and direct crawls of the API.

## Architecture

`isCrawler(userAgent)` is a runtime export of **`mogulgame_types`**, alongside the existing
`successResponse` / `errorResponse` / `isSuccessResponse` / `isErrorResponse`
(`mogulgame_types/src/index.ts:137,169,499,526`). Both the app and the API already depend on that
package and it has no React dependency, so the UA list has exactly one definition.

```
mogulgame_types    isCrawler(ua)  ──┬──> mogulgame_app   IS_CRAWLER (module const)
                                    │         ↓ passes { crawler: true }
                                    │    mogulgame_client  ?crawler=true
                                    │         ↓
                                    └──> mogulgame_api   isBotRequest(c)
                                              = query.crawler==='true' || isCrawler(UA header)
```

`mogulgame_lib` is **not** touched. It peer-depends on `react` and `@tanstack/react-query`, so the
API cannot import from it without pulling React into a Bun server. `mogulgame_lib` is not in the
network path — it holds pure helpers (`validateOfferPrice`, `formatPrice`) invoked from view code.

### Why trusting the client param is safe

The flag can only ever *reduce* work. Setting `crawler=true` grants no data and no access; worst
case a caller receives slightly stale data and forfeits their own view count. There is no privilege
to escalate, so the claim does not need to be authenticated.

## API contract

Add to `mogulgame_api/src/routes/properties.ts`:

```ts
function isBotRequest(c: Context): boolean {
  return c.req.query("crawler") === "true" || isCrawler(c.req.header("user-agent"));
}
```

When `isBotRequest(c)` is true, these endpoints perform no upstream calls and no writes:

| Endpoint | Guarded behavior | Anchor |
|---|---|---|
| `GET /properties/:id` | skip RealtyAPI refresh | `properties.ts:372` |
| | skip `resolvePropertyOffers` | `properties.ts:419` |
| | skip `property_views` upsert | `properties.ts:442` |
| `GET /properties/:id/history` | skip `getDetailById`; take the existing cached-reconstruction `else` branch | `properties.ts:486-507` |
| `GET /properties/search` | skip the RealtyAPI branch, serve DB-only; skip the `searchLogs` insert | `properties.ts:180` |

Search URLs are not crawl-discoverable today — `hasSearched` (`HomePage.tsx:688`) derives from URL
params, but the only thing that sets them is `navigate()` from `RecentSearchesPage.tsx:89`, an
onClick rather than an anchor. The search guard is belt-and-braces and costs one condition on the
same variable.

## Semantics when refresh is skipped

The property row still carries `price`, `address`, `images`, and `description` from the search-time
parse; only `detail_data` (tax history, schools) may be null. That is everything SEO needs. Serve
the row as-is.

- A missing property row remains a `404`, unchanged.
- A crawler `search` whose query misses the DB returns `200` with an empty `properties[]`, **not**
  the current `502` (`properties.ts:344`). The 502 signals upstream failure; no upstream call was
  attempted.

## UA matching

An explicit allowlist of known bot tokens. **Not** a generic `/bot/i`: real Android devices report
`CUBOT`, and a generic match would silently serve every Cubot owner stale data.

Include `HeadlessChrome`, which additionally makes the project's own Playwright prerender
(`scripts/prerender.mjs`) skip refresh for free.

```ts
const CRAWLER_UA = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|
facebookexternalhit|facebot|twitterbot|linkedinbot|applebot|petalbot|ia_archiver|gptbot|
oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|amazonbot|bytespider|
semrushbot|ahrefsbot|mj12bot|dotbot|headlesschrome|lighthouse/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_UA.test(userAgent);
}
```

(Written multi-line here for legibility; implement as a single-line regex or a token array.)

## Client changes

`mogulgame_client`:

- `StarterClient.getProperty(propertyId, opts?: { crawler?: boolean })` — appends `?crawler=true`
  when set (`StarterClient.ts:138`).
- `StarterClient.getPropertyHistory(propertyId, opts?: { crawler?: boolean })` — same
  (`StarterClient.ts:150`).
- `useProperty(nc, baseUrl, propertyId, options?: { crawler?: boolean })` (`useProperties.ts:66`).
- `usePropertyHistory(...)` — same (`useProperties.ts:111`).
- `searchProperties(params)` takes a `Record<string, string>`, so search needs **no signature
  change**; the app passes `crawler: 'true'` as an ordinary param.

`QUERY_KEYS` is **unchanged**. `IS_CRAWLER` is constant for a session, so a crawler and a human
never share a React Query cache within one page load. Adding it to the key would churn every
consumer for no benefit.

## App changes

`mogulgame_app/src/utils/crawler.ts`:

```ts
import { isCrawler } from '@sudobility/mogulgame_types';

export const IS_CRAWLER = isCrawler(
  typeof navigator !== 'undefined' ? navigator.userAgent : null
);
```

Evaluated once at module scope. Consumed by `PropertyDetailPage` (both `useProperty` and
`usePropertyHistory`) and folded into `HomePage`'s `searchParams` memo (`HomePage.tsx:665`).

## Observability

Log a counter when a refresh is skipped because of `isBotRequest`. Without it there is no way to
confirm the fix landed; the RealtyAPI dashboard is otherwise the only signal.

## Rollout order

1. `mogulgame_types` → publish `0.0.22` (adds `isCrawler`)
2. `mogulgame_api` → bump types dep, add `isBotRequest` guards, **deploy**
3. `mogulgame_client` → publish `0.0.31`
4. `mogulgame_app` → bump deps, add `IS_CRAWLER`, pass the flag, deploy

**The bleeding stops at step 2.** Server-side UA detection requires no client change, so RealtyAPI
burn ends as soon as the API deploys. Steps 3–4 add the explicit contract and cover clients whose
UA does not advertise itself.

This ordering is forced by the packaging: `mogulgame_app` depends on **published** registry
versions (`package.json:45-47` → `^0.0.30`, `^0.0.28`, `^0.0.21`). `node_modules/@sudobility/mogulgame_*`
are real directories, not symlinks, and `vite.config.ts:27-31` aliases only react/react-dom/react-helmet-async.
Editing `mogulgame_client/src` has no effect on the app until publish + bump.

## Testing

**`mogulgame_types`** — unit tests for `isCrawler`:
- Googlebot UA → `true`
- Chrome desktop UA → `false`
- `CUBOT` Android UA → `false` (regression guard against generic `/bot/i`)
- Playwright `HeadlessChrome` UA → `true`
- `null` / `''` / `undefined` → `false`

**`mogulgame_api`** — route tests asserting that with `?crawler=true`, and separately with a bot
`User-Agent` header:
- global `fetch` is never called
- `property_views` receives no write
- `/:id/history` returns the cached reconstruction
- `/search` returns `200` with `properties: []` rather than `502`

`src/routes/users.test.ts` establishes the route-test pattern. There is currently **no** `fetch`
stubbing infrastructure and zero tests under `src/services/realty/**`, so this adds a `fetch` spy.
`realtyFetch` (`src/services/realty/fetch.ts:7`) is the single seam every upstream call funnels
through. Note `REALTY_API_KEY` is captured at module import (`fetch.ts:5`) — irrelevant here, since
the assertion is that no call happens at all.

**`mogulgame_client`** — extend `StarterClient.test.ts`: the built URL contains `crawler=true` only
when the option is set.

**`mogulgame_app`** — unit-test the `IS_CRAWLER` const; assert `PropertyDetailPage` forwards it.

## Accepted consequences

- **Googlebot will index stale prices.** If a price changed today and the cache is a day old, the
  crawler sees yesterday's number. This is inherent: one cannot both refuse the upstream call and
  show fresh data. Real users still get the refresh.
- Crawler views stop counting toward PopularPage rankings. This is the intended correction.

## Out of scope

- A global `REALTY_API_ENABLED=false` env kill-switch (useful when quota is exhausted; a separate
  concern).
- Background/async refresh on the read path. It would fix real-user latency at cache-expiry but
  would **not** reduce RealtyAPI call volume, so it does not address this problem. Reasonable
  follow-up.

## Pre-existing bugs noticed, not fixed here

- `src/services/realty/cache.ts:17` hardcodes `-05:00` for "midnight ET"; wrong during EDT.
- `src/index.ts:63` defaults `PORT` to `8022`, while `.env.example` and both CLAUDE.md files say `8029`.
- `REALTY_API_KEY` is absent from `.env.example`; a fresh clone sends an empty `x-realtyapi-key`.
