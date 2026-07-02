/**
 * SEO injection middleware (Cloudflare Pages Function).
 *
 * For document navigations, it looks up a committed, pre-rendered content
 * snapshot at `/html/<route>/index.html` (produced by `bun run generate`) and
 * injects it into the LIVE `index.html` shell — so the served page combines:
 *   - the current, hashed JS/CSS bundle (from the freshly-built shell), and
 *   - the React-rendered head + body (from the committed snapshot).
 *
 * This decouples the committed snapshots from build-specific asset hashes: the
 * snapshots never reference the bundle, so they never go stale. If no snapshot
 * exists (or the asset store returns the SPA fallback), we pass through to normal
 * static serving / the SPA — see `next()`.
 *
 * It also (a) 301-redirects any trailing-slash URL to the slash-free canonical
 * form (source of truth — see sudobility/docs/SEO.md), and (b) rewrites <html lang> to the
 * route's language (the shell hardcodes `en`).
 *
 * Snapshot file format (see scripts/prerender.mjs):
 *   <!--PRERENDER-HEAD-->\n <route head tags> \n<!--PRERENDER-BODY-->\n <#root inner html>
 */

const HEAD_MARKER = '<!--PRERENDER-HEAD-->';
const BODY_MARKER = '<!--PRERENDER-BODY-->';

function snapshotPathFor(pathname) {
  const clean = pathname.replace(/\/+$/, '');
  return `/html${clean}/index.html`;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Only transform GET document navigations. Anything with a file extension is
  // a real asset (js/css/png/json/xml/...) — let Cloudflare serve it directly.
  if (request.method !== 'GET') return next();
  const lastSegment = url.pathname.split('/').pop() ?? '';
  if (lastSegment.includes('.')) return next();

  // Canonicalize every document route to have NO trailing slash (source of
  // truth), matching the canonical link, hreflang alternates, and sitemap. Both
  // forms otherwise return 200, so Googlebot would see two URLs per page whose
  // declared canonical disagreed with the crawled URL. Strip a trailing slash
  // and 301 to the slash-free form; the root "/" is left alone (handled by
  // _redirects -> /en). Assets and non-GET were already excluded above.
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = url.pathname.replace(/\/+$/, '');
    return Response.redirect(redirectUrl.toString(), 301);
  }

  // Language for the <html lang> attribute (e.g. /de/use-cases -> "de").
  const langMatch = url.pathname.match(/^\/([a-z]{2}(?:-[a-z]+)?)(?:\/|$)/);
  const lang = langMatch ? langMatch[1] : 'en';

  // Look up the committed snapshot for this route.
  const snapshotUrl = new URL(request.url);
  snapshotUrl.pathname = snapshotPathFor(url.pathname);
  const snapshotResp = await env.ASSETS.fetch(new Request(snapshotUrl, { method: 'GET' }));
  if (!snapshotResp.ok) return next();

  const snapshot = await snapshotResp.text();
  // ASSETS.fetch returns the SPA fallback (200) for missing files; the marker
  // check ensures we only inject genuine snapshots.
  const bodyIdx = snapshot.indexOf(BODY_MARKER);
  if (snapshot.indexOf(HEAD_MARKER) === -1 || bodyIdx === -1) return next();

  const head = snapshot.slice(HEAD_MARKER.length, bodyIdx).trim();
  const body = snapshot.slice(bodyIdx + BODY_MARKER.length).trim();

  // Fetch the live shell (built index.html, current hashed bundle).
  const shellUrl = new URL(request.url);
  shellUrl.pathname = '/index.html';
  const shellResp = await env.ASSETS.fetch(new Request(shellUrl, { method: 'GET' }));
  if (!shellResp.ok) return next();

  // Strip the shell's static/default SEO tags, then inject the route-specific
  // head and rendered body. (The shell's Organization JSON-LD is left intact.)
  const rewritten = new HTMLRewriter()
    .on('html', { element: e => e.setAttribute('lang', lang) })
    .on('title', { element: e => e.remove() })
    .on('meta[name="title"]', { element: e => e.remove() })
    .on('meta[name="description"]', { element: e => e.remove() })
    .on('meta[name="keywords"]', { element: e => e.remove() })
    .on('meta[name="robots"]', { element: e => e.remove() })
    .on('link[rel="canonical"]', { element: e => e.remove() })
    .on('link[rel="alternate"][hreflang]', { element: e => e.remove() })
    .on('meta[property^="og:"]', { element: e => e.remove() })
    .on('meta[name^="twitter:"]', { element: e => e.remove() })
    .on('head', { element: e => e.append(`\n${head}\n`, { html: true }) })
    .on('#root', { element: e => e.setInnerContent(body, { html: true }) })
    .transform(shellResp);

  return new Response(rewritten.body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
