# Crawler Skip RealtyAPI Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop crawler page-renders from triggering RealtyAPI refreshes, `property_views` writes, and offer resolution.

**Architecture:** `isCrawler(userAgent)` becomes a runtime export of `mogulgame_types`. `mogulgame_app` evaluates it once against `navigator.userAgent` and passes `?crawler=true`. `mogulgame_api` treats a request as a bot if that param is set **or** the `User-Agent` header matches, and then performs a read with no side effects.

**Tech Stack:** TypeScript, Bun, Hono (api), React 19 + Vite (app), TanStack Query (client), vitest (types/client/api).

Spec: `docs/superpowers/specs/2026-07-08-crawler-skip-realty-refresh-design.md`

## Global Constraints

- Query param name is exactly `crawler`; the API treats **only** the literal string `"true"` as true.
- UA matching uses an **explicit substring token list**, never a generic `/bot/i`. Real Android devices report `CUBOT`; a generic match would serve them stale data.
- `QUERY_KEYS` in `mogulgame_client/src/types.ts` is **not** modified. `IS_CRAWLER` is constant per session.
- `mogulgame_lib` is **not** touched. It peer-depends on `react`, so the API cannot import it.
- Version floors: `mogulgame_types` → `0.0.22`, `mogulgame_client` → `0.0.31`, `mogulgame_app` → `1.0.95`.
- The API's local dev port default is `8022` (`src/index.ts:63`), but `.env` sets `PORT=8029`, so it actually runs on **8029**.
- Publishing to npm is outward-facing and irreversible. Tasks 2 and 7 are **human gates** — stop and get explicit confirmation.

> **STATUS: implemented 2026-07-08.** Executed inline on `main` (no feature branches).
> Tasks 2 and 7 were **dissolved**: `mogulgame_app/scripts/push_all.sh` + CI own publishing,
> so there is no manual `npm publish`. See "Release" below.

### Local development before publishing

Tasks 3–6 and 8 consume packages that are not yet published. To typecheck them locally without publishing, link the workspace copies:

```bash
cd /Users/johnhuang/projects/mogulgame_types && bun link
cd /Users/johnhuang/projects/mogulgame_api  && bun link @sudobility/mogulgame_types
cd /Users/johnhuang/projects/mogulgame_client && bun link @sudobility/mogulgame_types
cd /Users/johnhuang/projects/mogulgame_client && bun link
cd /Users/johnhuang/projects/mogulgame_app  && bun link @sudobility/mogulgame_types @sudobility/mogulgame_client
```

Unlink after the real versions are published (`bun unlink`, then `bun install`).

## Deviations from the spec (deliberate, read before starting)

1. **The spec calls for API route tests with a `fetch` spy.** There is no such harness. `src/routes/users.test.ts` tests *pure logic* (response shape, authorization predicates) — it never constructs a Hono app or touches the DB, and `properties.ts` imports a lazily-connecting `db` Proxy. Rather than build a DB-backed route harness for this change, the bot decision is extracted into a **pure function** `isBotRequest(crawlerParam, userAgent)` in `src/lib/crawler-request.ts` and unit-tested there. The route wiring is covered by typecheck plus the manual curl checks in Task 4.
2. **The spec calls for an app unit test.** `mogulgame_app` has **no test runner** — `verify` is `typecheck && lint && format:check`, and CLAUDE.md states "no test suite; relies on type checking". Adding vitest to the app is out of scope. Task 8 verifies via `bun run verify` plus a concrete DevTools UA-override check.
3. **Bot `GET /properties/search` with no search params** returns `200 {properties: []}` instead of the current `400`. Preserving the 400 would mean duplicating the param-validation else-chain. The endpoint is not crawl-discoverable, and returning an empty result to a bot is preferable to an error.

## File Structure

| Repo | File | Responsibility |
|---|---|---|
| types | `src/crawler.ts` (create) | The UA token list and `isCrawler()`. Sole definition. |
| types | `src/crawler.test.ts` (create) | `isCrawler` unit tests. |
| types | `src/index.ts` (modify) | Re-export `./crawler`. |
| api | `src/lib/crawler-request.ts` (create) | Pure `isBotRequest(param, ua)` — the testable seam. |
| api | `src/lib/crawler-request.test.ts` (create) | `isBotRequest` unit tests. |
| api | `src/routes/properties.ts` (modify) | Guard the three side effects. |
| client | `src/network/StarterClient.ts` (modify) | `crawler?: boolean` on two existing option bags. |
| client | `src/network/StarterClient.test.ts` (modify) | URL assertions. |
| client | `src/hooks/useProperties.ts` (modify) | Thread `crawler` through two hooks. |
| app | `src/utils/crawler.ts` (create) | `IS_CRAWLER` module constant. |
| app | `src/pages/PropertyDetailPage.tsx` (modify) | Pass the flag to both hooks. |
| app | `src/pages/HomePage.tsx` (modify) | Fold the flag into `searchParams`. |

---

### Task 1: `isCrawler()` in mogulgame_types

**Files:**
- Create: `/Users/johnhuang/projects/mogulgame_types/src/crawler.ts`
- Create: `/Users/johnhuang/projects/mogulgame_types/src/crawler.test.ts`
- Modify: `/Users/johnhuang/projects/mogulgame_types/src/index.ts` (add one re-export line)
- Modify: `/Users/johnhuang/projects/mogulgame_types/package.json:3` (version → `0.0.22`)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function isCrawler(userAgent: string | null | undefined): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/crawler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isCrawler } from './crawler';

const GOOGLEBOT =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/119.0.0.0 Safari/537.36';
const CHROME_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CUBOT_ANDROID =
  'Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20 PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36';
const PLAYWRIGHT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36';

describe('isCrawler', () => {
  it('detects Googlebot', () => {
    expect(isCrawler(GOOGLEBOT)).toBe(true);
  });

  it('detects Playwright HeadlessChrome (our own prerender)', () => {
    expect(isCrawler(PLAYWRIGHT)).toBe(true);
  });

  it('detects AI crawlers', () => {
    expect(isCrawler('Mozilla/5.0 (compatible; GPTBot/1.1)')).toBe(true);
    expect(isCrawler('Mozilla/5.0 (compatible; ClaudeBot/1.0)')).toBe(true);
    expect(isCrawler('Mozilla/5.0 (compatible; PerplexityBot/1.0)')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isCrawler('GOOGLEBOT/2.1')).toBe(true);
  });

  it('does not match a normal desktop browser', () => {
    expect(isCrawler(CHROME_DESKTOP)).toBe(false);
  });

  it('does not match CUBOT Android phones (regression: no generic /bot/i)', () => {
    expect(isCrawler(CUBOT_ANDROID)).toBe(false);
  });

  it('returns false for absent user agents', () => {
    expect(isCrawler(null)).toBe(false);
    expect(isCrawler(undefined)).toBe(false);
    expect(isCrawler('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/johnhuang/projects/mogulgame_types && bunx vitest run src/crawler.test.ts
```

Expected: FAIL — `Failed to resolve import "./crawler"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/crawler.ts`:

```typescript
/**
 * Known crawler User-Agent tokens, lowercased.
 *
 * This is an explicit allowlist on purpose. A generic /bot/i would match real
 * Android devices that report `CUBOT`, silently serving those users stale data.
 *
 * `headlesschrome` is included so our own Playwright prerender
 * (mogulgame_app/scripts/prerender.mjs) is treated as a crawler.
 */
const CRAWLER_UA_TOKENS: readonly string[] = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'applebot',
  'petalbot',
  'ia_archiver',
  'gptbot',
  'oai-searchbot',
  'chatgpt-user',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'perplexitybot',
  'amazonbot',
  'bytespider',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'headlesschrome',
  'lighthouse',
];

/**
 * Returns true when the User-Agent belongs to a known crawler or headless renderer.
 *
 * Used by mogulgame_app to set `?crawler=true`, and independently by mogulgame_api
 * as a server-side fallback for clients that do not set the param.
 *
 * @param userAgent - A User-Agent string, or null/undefined when unavailable.
 */
export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA_TOKENS.some(token => ua.includes(token));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/johnhuang/projects/mogulgame_types && bunx vitest run src/crawler.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Re-export from the package entry point**

In `src/index.ts`, add this line immediately after the existing `@sudobility/types` re-export block near the top of the file:

```typescript
export * from './crawler';
```

- [ ] **Step 6: Bump the version**

In `package.json`, change line 3 from `"version": "0.0.21",` to:

```json
  "version": "0.0.22",
```

- [ ] **Step 7: Verify the whole package**

```bash
cd /Users/johnhuang/projects/mogulgame_types && bun run verify
```

Expected: typecheck clean, lint clean, all tests pass, `tsc -p tsconfig.esm.json` emits `dist/`.

- [ ] **Step 8: Commit**

```bash
cd /Users/johnhuang/projects/mogulgame_types
git add src/crawler.ts src/crawler.test.ts src/index.ts package.json
git commit -m "feat: add isCrawler() user-agent detection

Shared by mogulgame_app (sets ?crawler=true) and mogulgame_api
(server-side fallback). Explicit token allowlist rather than a
generic /bot/i, which would match CUBOT Android devices."
```

---

### Task 2: Publish mogulgame_types 0.0.22 — HUMAN GATE

**Files:** none.

**Interfaces:**
- Consumes: Task 1's committed `0.0.22`.
- Produces: `@sudobility/mogulgame_types@0.0.22` on the registry, resolvable by Tasks 3 and 8.

- [ ] **Step 1: STOP. Ask the human to confirm the publish.**

Publishing is irreversible and outward-facing. Show them `git log --oneline -1` and the version, and wait for an explicit yes. Do not run `npm publish` on your own initiative.

- [ ] **Step 2: Publish (only after confirmation)**

```bash
cd /Users/johnhuang/projects/mogulgame_types && npm publish --access public
```

`prepublishOnly` runs `clean && verify` automatically. Expected: `+ @sudobility/mogulgame_types@0.0.22`.

- [ ] **Step 3: Confirm it resolves**

```bash
npm view @sudobility/mogulgame_types@0.0.22 version
```

Expected: `0.0.22`.

---

### Task 3: `isBotRequest()` in mogulgame_api

**Files:**
- Create: `/Users/johnhuang/projects/mogulgame_api/src/lib/crawler-request.ts`
- Create: `/Users/johnhuang/projects/mogulgame_api/src/lib/crawler-request.test.ts`
- Modify: `/Users/johnhuang/projects/mogulgame_api/package.json` (bump `@sudobility/mogulgame_types` to `^0.0.22`)

**Interfaces:**
- Consumes: `isCrawler(userAgent: string | null | undefined): boolean` from `@sudobility/mogulgame_types` (Task 1).
- Produces: `export function isBotRequest(crawlerParam: string | undefined, userAgent: string | undefined): boolean` — consumed by Task 4.

- [ ] **Step 1: Bump the types dependency**

In `package.json`, set the `@sudobility/mogulgame_types` dependency to `^0.0.22`, then:

```bash
cd /Users/johnhuang/projects/mogulgame_api && bun install
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/crawler-request.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isBotRequest } from "./crawler-request";

const GOOGLEBOT =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("isBotRequest", () => {
  it("is true when the crawler param is exactly 'true'", () => {
    expect(isBotRequest("true", CHROME)).toBe(true);
  });

  it("is true when the user agent is a known crawler", () => {
    expect(isBotRequest(undefined, GOOGLEBOT)).toBe(true);
  });

  it("is true when both signals are present", () => {
    expect(isBotRequest("true", GOOGLEBOT)).toBe(true);
  });

  it("is false for a normal browser with no param", () => {
    expect(isBotRequest(undefined, CHROME)).toBe(false);
  });

  it("does not treat truthy-ish param values as true", () => {
    expect(isBotRequest("1", CHROME)).toBe(false);
    expect(isBotRequest("yes", CHROME)).toBe(false);
    expect(isBotRequest("TRUE", CHROME)).toBe(false);
    expect(isBotRequest("", CHROME)).toBe(false);
  });

  it("is false when both signals are absent", () => {
    expect(isBotRequest(undefined, undefined)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/johnhuang/projects/mogulgame_api && bunx vitest run src/lib/crawler-request.test.ts
```

Expected: FAIL — `Failed to resolve import "./crawler-request"`.

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/crawler-request.ts`:

```typescript
import { isCrawler } from "@sudobility/mogulgame_types";

/**
 * Decide whether a request should be treated as a crawler request.
 *
 * Two independent signals:
 *   - `?crawler=true`, set explicitly by mogulgame_app after checking
 *     navigator.userAgent. This is the contract.
 *   - A crawler User-Agent header. This is defense-in-depth, covering
 *     mogulgame_app_rn, clients pinned to older published packages, and
 *     direct crawls of the API.
 *
 * Trusting the client param is safe: the flag can only ever *reduce* work.
 * It grants no data and no access, so there is no privilege to escalate.
 *
 * @param crawlerParam - Raw value of the `crawler` query param.
 * @param userAgent - Raw value of the `User-Agent` request header.
 */
export function isBotRequest(
  crawlerParam: string | undefined,
  userAgent: string | undefined
): boolean {
  return crawlerParam === "true" || isCrawler(userAgent);
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/johnhuang/projects/mogulgame_api && bunx vitest run src/lib/crawler-request.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/johnhuang/projects/mogulgame_api
git add src/lib/crawler-request.ts src/lib/crawler-request.test.ts package.json bun.lock
git commit -m "feat: add isBotRequest() — param OR user-agent crawler detection"
```

---

### Task 4: Guard the three side effects in properties.ts

**Files:**
- Modify: `/Users/johnhuang/projects/mogulgame_api/src/routes/properties.ts`

**Interfaces:**
- Consumes: `isBotRequest(crawlerParam, userAgent)` from `../lib/crawler-request` (Task 3).
- Produces: `?crawler=true` honored on three endpoints. Consumed by Tasks 5–8 and by Googlebot.

There is no test step here — see Deviation 1. Correctness is established by Task 3's unit tests plus the manual curl checks in Step 7.

- [ ] **Step 1: Add the import**

In `src/routes/properties.ts`, after the existing `import { verifyIdToken } from "../services/firebase";` line (line 25), add:

```typescript
import { isBotRequest } from "../lib/crawler-request";
```

Also add `type PropertySearchResponse` to the existing `@sudobility/mogulgame_types` import if not already present — it is (line 7).

- [ ] **Step 2: Guard the search endpoint**

In the `GET /search` handler, immediately **before** the `// Search via RealtyAPI` comment (currently line 180) and before the `try {` that follows it, insert:

```typescript
  // Crawlers get a side-effect-free read: no upstream call, no search log.
  // Note: this also returns 200 (rather than 400) when a bot supplies no
  // search params. The endpoint is not crawl-discoverable; an empty result
  // beats an error page.
  if (isBotRequest(c.req.query("crawler"), c.req.header("user-agent"))) {
    console.log(`[crawler] skipped RealtyAPI search (country=${country})`);
    const response: PropertySearchResponse = {
      properties: [],
      total: 0,
      page,
      limit,
      has_more: false,
    };
    return c.json(successResponse(response));
  }
```

- [ ] **Step 3: Guard the detail endpoint**

In the `GET /:id` handler, immediately after `const propertyCountry = property.country as CountryCode;`, insert:

```typescript
  const bot = isBotRequest(c.req.query("crawler"), c.req.header("user-agent"));
  if (bot) {
    console.log(`[crawler] side-effect-free read of property ${id}`);
  }
```

Then change the refresh condition (currently line 372) from:

```typescript
  if (isCacheExpired(property.cached_at) || !property.detail_data) {
```

to:

```typescript
  if (!bot && (isCacheExpired(property.cached_at) || !property.detail_data)) {
```

Then change the resolution condition (currently line 419) from:

```typescript
  if (property.listing_status === "sold" && property.sold_price) {
```

to:

```typescript
  if (!bot && property.listing_status === "sold" && property.sold_price) {
```

- [ ] **Step 4: Guard the view-tracking write**

The view-tracking block begins at the `// Track property view (fire-and-forget)` comment (currently line 442) and runs through the end of the `db.execute(sql\`...\`)` statement and its `.catch(...)`. Wrap the entire block — the `address`/`imageUrl` consts and the `db.execute` call — in:

```typescript
  if (!bot) {
    // ... existing address / imageUrl / db.execute(...) block, unchanged ...
  }
```

Do not delete anything inside; only indent it one level. Crawler views must not feed `GET /views/popular`.

- [ ] **Step 5: Guard the history endpoint**

In the `GET /:id/history` handler, after `const propertyCountry = property.country as CountryCode;`, insert:

```typescript
  const bot = isBotRequest(c.req.query("crawler"), c.req.header("user-agent"));
```

Then change the branch (currently line 486) from:

```typescript
    if (property.source_id) {
```

to:

```typescript
    if (!bot && property.source_id) {
```

A bot now falls into the existing `else` branch, which reconstructs price history from the cached `listed_at` / `sold_at` columns with no upstream call. That branch already exists and needs no change.

- [ ] **Step 6: Verify the package**

```bash
cd /Users/johnhuang/projects/mogulgame_api && bun run verify
```

Expected: typecheck clean, lint clean, all tests pass, build succeeds.

- [ ] **Step 7: Manual end-to-end check against a running API**

Start the server (`bun run dev`; it listens on **8022**). Pick any UUID from the `properties` table. Watch the server log while running:

```bash
ID=<a-real-property-uuid>

# 1. Explicit param -> expect "[crawler] side-effect-free read" in the log
curl -s "http://localhost:8022/api/v1/properties/$ID?crawler=true" -o /dev/null -w '%{http_code}\n'

# 2. Googlebot UA, no param -> expect the same log line
curl -s -H 'User-Agent: Googlebot/2.1' \
  "http://localhost:8022/api/v1/properties/$ID" -o /dev/null -w '%{http_code}\n'

# 3. Normal browser -> expect NO crawler log line
curl -s -H 'User-Agent: Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36' \
  "http://localhost:8022/api/v1/properties/$ID" -o /dev/null -w '%{http_code}\n'

# 4. Bot search -> expect 200 with an empty properties array
curl -s -H 'User-Agent: Googlebot/2.1' \
  'http://localhost:8022/api/v1/properties/search?query=Austin&country=US' | head -c 200; echo
```

Expected: 1 and 2 print `200` and log `[crawler] side-effect-free read of property …`. 3 prints `200` and logs nothing. 4 prints `{"success":true,"data":{"properties":[],"total":0,...`.

Confirm the view count did not move:

```sql
SELECT view_count FROM mogulgame.property_views WHERE property_id = '<ID>';
```

Run it before and after requests 1, 2, and 4. It must be unchanged. After request 3 it must increment.

- [ ] **Step 8: Commit**

```bash
cd /Users/johnhuang/projects/mogulgame_api
git add src/routes/properties.ts
git commit -m "feat: crawler requests skip RealtyAPI refresh, views, and resolution

Googlebot renders the SPA on /:lang/properties/:id, which called
GET /api/v1/properties/:id and triggered a daily-expiry RealtyAPI
refresh. The same request upserted property_views (inflating the
PopularPage ranking) and could fire resolvePropertyOffers.

A crawler request is now a read with no side effects."
```

---

### Task 5: `crawler` option on StarterClient

**Files:**
- Modify: `/Users/johnhuang/projects/mogulgame_client/src/network/StarterClient.ts:138` (`getProperty`), `:150` (`getPropertyHistory`)
- Modify: `/Users/johnhuang/projects/mogulgame_client/src/network/StarterClient.test.ts`
- Modify: `/Users/johnhuang/projects/mogulgame_client/package.json` (devDependency `@sudobility/mogulgame_types` → `^0.0.22`)

**Interfaces:**
- Consumes: the API contract from Task 4.
- Produces:
  - `getProperty(propertyId: string, options?: { timeout?: number; crawler?: boolean }): Promise<BaseResponse<Property>>`
  - `getPropertyHistory(propertyId: string, options?: { timeout?: number; crawler?: boolean }): Promise<BaseResponse<PropertyPriceHistoryResponse>>`

  Both are consumed by Task 6. Note both methods **already** take an options bag with `timeout`; add to it rather than adding a parameter.

- [ ] **Step 1: Write the failing test**

Append inside the top-level `describe('StarterClient', ...)` block in `src/network/StarterClient.test.ts`:

```typescript
  describe('crawler option', () => {
    it('appends crawler=true to getProperty when set', async () => {
      await client.getProperty('prop-1', { crawler: true });
      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/properties/prop-1?crawler=true',
        expect.anything()
      );
    });

    it('omits the param from getProperty when unset or false', async () => {
      await client.getProperty('prop-1');
      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/properties/prop-1',
        expect.anything()
      );

      await client.getProperty('prop-1', { crawler: false });
      expect(mockNetworkClient.get).toHaveBeenLastCalledWith(
        'https://api.example.com/api/v1/properties/prop-1',
        expect.anything()
      );
    });

    it('appends crawler=true to getPropertyHistory when set', async () => {
      await client.getPropertyHistory('prop-1', { crawler: true });
      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/properties/prop-1/history?crawler=true',
        expect.anything()
      );
    });

    it('omits the param from getPropertyHistory when unset', async () => {
      await client.getPropertyHistory('prop-1');
      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/properties/prop-1/history',
        expect.anything()
      );
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/johnhuang/projects/mogulgame_client && bunx vitest run src/network/StarterClient.test.ts -t 'crawler option'
```

Expected: FAIL — TypeScript rejects `{ crawler: true }`, and the received URL lacks `?crawler=true`.

- [ ] **Step 3: Write minimal implementation**

Replace `getProperty` and `getPropertyHistory` in `src/network/StarterClient.ts` with:

```typescript
  async getProperty(
    propertyId: string,
    options?: { timeout?: number; crawler?: boolean }
  ): Promise<BaseResponse<Property>> {
    const query = options?.crawler ? '?crawler=true' : '';
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/properties/${propertyId}${query}`
    );
    const response = await this.networkClient.get(url, {
      headers: createHeaders(),
      timeout: options?.timeout,
    });
    return validateResponse<Property>(response.data, 'getProperty');
  }

  async getPropertyHistory(
    propertyId: string,
    options?: { timeout?: number; crawler?: boolean }
  ): Promise<BaseResponse<PropertyPriceHistoryResponse>> {
    const query = options?.crawler ? '?crawler=true' : '';
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/properties/${propertyId}/history${query}`
    );
    const response = await this.networkClient.get(url, {
      headers: createHeaders(),
      timeout: options?.timeout,
    });
    return validateResponse<PropertyPriceHistoryResponse>(
      response.data,
      'getPropertyHistory'
    );
  }
```

`searchProperties(params)` takes a `Record<string, string>` and needs **no change** — the app passes `crawler: 'true'` as an ordinary param.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/johnhuang/projects/mogulgame_client && bunx vitest run src/network/StarterClient.test.ts
```

Expected: PASS, including the four new tests and all pre-existing ones.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnhuang/projects/mogulgame_client
git add src/network/StarterClient.ts src/network/StarterClient.test.ts package.json
git commit -m "feat: crawler option on getProperty and getPropertyHistory"
```

---

### Task 6: Thread `crawler` through the hooks

**Files:**
- Modify: `/Users/johnhuang/projects/mogulgame_client/src/hooks/useProperties.ts:66` (`useProperty`), `:111` (`usePropertyHistory`)
- Modify: `/Users/johnhuang/projects/mogulgame_client/package.json:3` (version → `0.0.31`)

**Interfaces:**
- Consumes: `getProperty` / `getPropertyHistory` option bags from Task 5.
- Produces:
  - `useProperty(networkClient, baseUrl, propertyId, options?: { enabled?: boolean; crawler?: boolean }): UsePropertyReturn`
  - `usePropertyHistory(networkClient, baseUrl, propertyId, options?: { enabled?: boolean; crawler?: boolean }): UsePropertyHistoryReturn`

  Both consumed by Task 8. Return types are unchanged.

- [ ] **Step 1: Widen the `useProperty` options type and pass the flag**

In `src/hooks/useProperties.ts`, change the `useProperty` signature from:

```typescript
  options?: { enabled?: boolean }
```

to:

```typescript
  options?: { enabled?: boolean; crawler?: boolean }
```

and change its `queryFn` body from:

```typescript
      const response = await client.getProperty(propertyId!);
```

to:

```typescript
      const response = await client.getProperty(propertyId!, {
        crawler: options?.crawler,
      });
```

- [ ] **Step 2: Do the same for `usePropertyHistory`**

Change its signature from:

```typescript
  options?: { enabled?: boolean }
```

to:

```typescript
  options?: { enabled?: boolean; crawler?: boolean }
```

and its `queryFn` body from:

```typescript
      const response = await client.getPropertyHistory(propertyId!);
```

to:

```typescript
      const response = await client.getPropertyHistory(propertyId!, {
        crawler: options?.crawler,
      });
```

Do **not** add `crawler` to `QUERY_KEYS.property()` or `QUERY_KEYS.propertyHistory()`. `IS_CRAWLER` is constant for a session, so a crawler and a human never share a cache within one page load.

- [ ] **Step 3: Bump the version**

In `package.json`, change line 3 from `"version": "0.0.30",` to:

```json
  "version": "0.0.31",
```

- [ ] **Step 4: Verify the package**

```bash
cd /Users/johnhuang/projects/mogulgame_client && bun run verify
```

Expected: typecheck clean, all tests pass, build emits `dist/`.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnhuang/projects/mogulgame_client
git add src/hooks/useProperties.ts package.json
git commit -m "feat: crawler option on useProperty and usePropertyHistory"
```

---

### Task 7: Publish mogulgame_client 0.0.31 — HUMAN GATE

**Files:** none.

**Interfaces:**
- Consumes: Task 6's committed `0.0.31`.
- Produces: `@sudobility/mogulgame_client@0.0.31` on the registry, resolvable by Task 8.

- [ ] **Step 1: STOP. Ask the human to confirm the publish.**

Same rule as Task 2. Wait for an explicit yes.

- [ ] **Step 2: Publish (only after confirmation)**

```bash
cd /Users/johnhuang/projects/mogulgame_client && npm publish --access public
```

Expected: `+ @sudobility/mogulgame_client@0.0.31`.

- [ ] **Step 3: Confirm it resolves**

```bash
npm view @sudobility/mogulgame_client@0.0.31 version
```

Expected: `0.0.31`.

---

### Task 8: Detect and pass the flag from mogulgame_app

**Files:**
- Create: `/Users/johnhuang/projects/mogulgame_app/src/utils/crawler.ts`
- Modify: `/Users/johnhuang/projects/mogulgame_app/src/pages/PropertyDetailPage.tsx:91-92`
- Modify: `/Users/johnhuang/projects/mogulgame_app/src/pages/HomePage.tsx:667-686` (the `searchParams` memo)
- Modify: `/Users/johnhuang/projects/mogulgame_app/package.json:3,45,47`

**Interfaces:**
- Consumes: `isCrawler` (Task 1), `useProperty` / `usePropertyHistory` crawler options (Task 6).
- Produces: `export const IS_CRAWLER: boolean` from `src/utils/crawler.ts`.

There is no unit test here — see Deviation 2. Verification is `bun run verify` plus the DevTools check in Step 6.

- [ ] **Step 1: Bump the dependencies**

In `package.json`: version → `1.0.95`; `@sudobility/mogulgame_client` → `^0.0.31`; `@sudobility/mogulgame_types` → `^0.0.22`. Leave `@sudobility/mogulgame_lib` at `^0.0.28` — it is not part of this change. Then:

```bash
cd /Users/johnhuang/projects/mogulgame_app && bun install
```

- [ ] **Step 2: Create the detection module**

Create `src/utils/crawler.ts`:

```typescript
import { isCrawler } from '@sudobility/mogulgame_types';

/**
 * Whether this page is being rendered by a crawler.
 *
 * Evaluated once at module scope: a session's user agent never changes, and
 * every consumer must agree. Requests carrying this flag skip the API's
 * RealtyAPI refresh, view-count write, and offer resolution.
 *
 * The API independently sniffs the User-Agent header, so this is the explicit
 * contract rather than the sole mechanism. It is also the seam for future
 * non-header signals (navigator.webdriver, headless heuristics) that a
 * User-Agent cannot carry.
 */
export const IS_CRAWLER = isCrawler(
  typeof navigator !== 'undefined' ? navigator.userAgent : null
);
```

- [ ] **Step 3: Pass the flag from PropertyDetailPage**

In `src/pages/PropertyDetailPage.tsx`, add to the import block at the top:

```typescript
import { IS_CRAWLER } from '../utils/crawler';
```

Then replace lines 91–92:

```typescript
  const { property, isLoading, error } = useProperty(networkClient, baseUrl, propertyId ?? null);
  const { data: historyData } = usePropertyHistory(networkClient, baseUrl, propertyId ?? null);
```

with:

```typescript
  const { property, isLoading, error } = useProperty(
    networkClient,
    baseUrl,
    propertyId ?? null,
    { crawler: IS_CRAWLER }
  );
  const { data: historyData } = usePropertyHistory(
    networkClient,
    baseUrl,
    propertyId ?? null,
    { crawler: IS_CRAWLER }
  );
```

- [ ] **Step 4: Fold the flag into HomePage's search params**

In `src/pages/HomePage.tsx`, add to the import block at the top:

```typescript
import { IS_CRAWLER } from '../utils/crawler';
```

Then in the `searchParams` memo, insert immediately before `return params;`:

```typescript
    if (IS_CRAWLER) params.crawler = 'true';
```

Leave the memo's dependency array unchanged — `IS_CRAWLER` is a module constant, not reactive state. Adding it would trip `react-hooks/exhaustive-deps` for no benefit.

- [ ] **Step 5: Verify the app**

```bash
cd /Users/johnhuang/projects/mogulgame_app && bun run verify
```

Expected: `typecheck && lint && format:check` all clean. (The app has no test suite by design.)

- [ ] **Step 6: Manual check with a spoofed user agent**

Start both servers (`bun run dev` in `mogulgame_api`, then in `mogulgame_app`). In Chrome:

1. Open DevTools → ⋮ → More tools → Network conditions.
2. Uncheck "Use browser default" and set User agent to:
   `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html)`
3. Hard-reload a property page: `http://localhost:5173/en/properties/<uuid>`
4. In the Network tab, confirm the request to `/api/v1/properties/<uuid>` has **`?crawler=true`** in its URL, and so does `/history`.
5. Confirm the API log prints `[crawler] side-effect-free read of property …`.
6. Restore "Use browser default", hard-reload, and confirm the param is **absent** and the API logs nothing.

- [ ] **Step 7: Commit**

```bash
cd /Users/johnhuang/projects/mogulgame_app
git add src/utils/crawler.ts src/pages/PropertyDetailPage.tsx src/pages/HomePage.tsx package.json bun.lock
git commit -m "feat: detect crawlers and pass ?crawler=true to the API

Bumps mogulgame_types to 0.0.22 and mogulgame_client to 0.0.31."
```

---

## Post-deploy verification

The bleeding stops when **Task 4 deploys**, not when Task 8 does — server-side UA detection needs no client change.

After the API deploys, confirm the fix landed:

```bash
# Crawler reads should now appear in the API logs.
grep -c '\[crawler\]' <api-log-stream>
```

Then check the RealtyAPI dashboard for a drop in daily call volume. If `[crawler]` never appears in the logs, the crawl is not reaching the API with a bot User-Agent, and the whole model of the vector is wrong — stop and re-investigate before shipping Tasks 5–8.

## Out of scope

- A global `REALTY_API_ENABLED=false` env kill-switch.
- Background/async refresh on the read path.
- The pre-existing bugs recorded at the end of the spec (`cache.ts:17` EDT offset, `PORT` default 8022 vs documented 8029, `REALTY_API_KEY` missing from `.env.example`).

---

## What execution actually found (2026-07-08)

**1. `tsc` breaks ESM re-exports without a `.js` extension.** `mogulgame_types` is
`"type": "module"`, and `index.ts` had never had a relative import before. `export * from './crawler'`
typechecks, passes vitest (bundler resolution), and **builds** — then dies at runtime with
`ERR_MODULE_NOT_FOUND` when Node imports `dist/index.js`. `bun run verify` does not catch this.
The fix is `export * from './crawler.js'`. Caught only by importing the built artifact:

```bash
node -e "import('./dist/index.js').then(m => console.log(typeof m.isCrawler))"
```

Worth adding to `verify` for any package with relative imports.

**2. The API repo enforces `no-console` (only `warn`/`error`).** The three `[crawler]` observability
logs need `// eslint-disable-next-line no-console` rather than downgrading to `console.warn`, which
would fire warn-level alerting on every crawl.

**3. `getProperty` / `getPropertyHistory` already had an options bag** (`{ timeout?: number }`), and
the hooks already had `{ enabled?: boolean }`. `crawler` was added to those, not as a new parameter.
`searchProperties(params)` takes a `Record<string, string>` and needed **no** client change.

**4. `/:id/history` also needed an observability log.** The plan only specified logs on `/:id` and
`/search`, so history-endpoint savings were invisible. Added.

**5. The app's dev server runs the API on 8029, not 8022** — `.env` sets `PORT`.

## Verification performed

Live API + postgres + vite + Playwright, against property `679eaf0c…` (cached `2026-05-05`, i.e. stale):

| Request | RealtyAPI | `cached_at` | `view_count` | Latency |
|---|---|---|---|---|
| `/:id?crawler=true` | not called | unchanged | unchanged | 25 ms |
| `/:id` + Googlebot UA | not called | unchanged | unchanged | 24 ms |
| `/:id` + Chrome UA (control) | **called** | **refreshed** | **0 → 1** | 1797 ms |
| `/:id/history` + Googlebot UA | not called | — | — | fast |
| `/:id/history` + Chrome UA (control) | **called** | — | — | 727 ms |
| `/search` + Googlebot UA | not called | — | 0 `search_logs` rows | 1.8 ms |

Browser-level, via Playwright with `addInitScript` overriding `navigator.userAgent` before app JS runs:

- Real Chrome UA → `GET /properties/:id` and `/history` with **no** `crawler` param; `view_count` incremented.
- Googlebot UA → both requests carry **`?crawler=true`**; API emits two `[crawler]` lines; `view_count`
  and `cached_at` unchanged; page still renders `<title>`, `<h1>`, and price, so indexing is unaffected.

## Release

`push_all.sh` (which sources `workflows/scripts/push_projects.sh`) decides "has changes" from a
**dirty working tree** (`:1289-1292`), not from unpushed commits. With everything committed, it
**skips** every clean repo. It also never checks the branch — a plain `git push` (`:1168`) plus
`--set-upstream origin <current-branch>` (`:1177`) will happily push feature branches, where CI
(`on: push: branches: [main, develop]`) never publishes.

Therefore the release sequence is:

1. Bump `mogulgame_types` version manually, commit, `git push` → CI publishes.
2. Poll `npm view @sudobility/mogulgame_types@<version> --prefer-online` until live. **Do not** rely on
   the script's fixed `sleep 60` (`:1432`) — CI takes 1–3 min, and `fetch_latest_versions_parallel`
   (`:390`) omits `--prefer-online`, so npm's 5-min metadata cache can serve a stale version.
   (`get_latest_version` at `:376-379` *does* pass the flag but is dead code — never called.)
3. `./push_all.sh` — `api`, `client`, `lib`, `app`, `app_rn` now see the new types, go dirty, bump,
   validate, and publish in dependency order.
4. If it aborts (loudly) on a stale `npm view`, resume with `./push_all.sh --starting-project <name>`.

Also: `push_all.sh` runs `git add -A` (`:1144`). Make sure the tree contains nothing you don't want
published — e.g. Playwright MCP writes a `.playwright-mcp/` directory into the repo root.

### The trap, stated plainly

**`push_all.sh` exits 0 and prints `All Projects Processed Successfully!` when it has done nothing.**

It skips any repo with a clean working tree. If you commit your work first — as you would on any
normal workflow — every repo is clean, every repo is skipped, and the run "succeeds" while pushing
and publishing nothing. This happened twice during this change:

- First run: `mogulgame_types` skipped. Worked around by bumping + pushing types by hand *before*
  the run, which made every downstream repo dirty (via the dep rewrite) and let the cascade proceed.
- Second run (the security hardening): `mogulgame_api` skipped, `EXIT=0`, banner printed success,
  nothing pushed. Caught only by checking `git rev-list --count origin/main..main` afterwards.

**Always verify after a run:**

```bash
for d in mogulgame_types mogulgame_api mogulgame_client mogulgame_lib mogulgame_app mogulgame_app_rn; do
  p=../$d
  printf "%-18s v=%-8s unpushed=%s\n" "$d" \
    "$(node -p "require('$p/package.json').version")" \
    "$(git -C $p rev-list --count origin/main..main)"
done
```

Any nonzero `unpushed` means the script skipped that repo. Either leave the change uncommitted and
let the script author the commit (its intended workflow), bump the version by hand and `git push`,
or use `--force`.
