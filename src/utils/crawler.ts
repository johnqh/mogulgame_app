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
export const IS_CRAWLER = isCrawler(typeof navigator !== 'undefined' ? navigator.userAgent : null);
