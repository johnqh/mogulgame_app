/**
 * Format a date string or ISO timestamp into a locale-aware date/time string.
 *
 * Uses `Intl.DateTimeFormat` so the output respects the user's language
 * and regional conventions (e.g. 24-hour vs. 12-hour clock).
 *
 * @param datetime - An ISO 8601 date string or any value accepted by `new Date()`.
 * @param locale  - A BCP 47 language tag (e.g. `"en"`, `"ja"`, `"ar"`).
 *                  Defaults to the browser's current locale.
 * @returns A human-readable date/time string, or the raw input if parsing fails.
 */
export function formatDateTime(datetime: string | number | Date, locale?: string): string {
  try {
    const date = datetime instanceof Date ? datetime : new Date(datetime);
    if (Number.isNaN(date.getTime())) {
      return String(datetime);
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return String(datetime);
  }
}
