// ============================================================
// Locale for Intl (numbers, currency, dates).
//
// Formatting with the *runtime's* locale (`Intl.NumberFormat(undefined)`)
// made the same amount render differently per browser ("MXN 9,000" vs
// "9000 MXN") and could differ between the server render and the
// browser (hydration mismatch). Derive it from the app locale instead —
// NEXT_PUBLIC_APP_LOCALE is inlined at build time, so server and client
// always agree.
// ============================================================

const INTL_BY_APP_LOCALE: Record<string, string> = {
  // es-419 (Latin America): "MXN 930,000", "MXN 9,000", "5 dic 2026".
  es: 'es-419',
  en: 'en-US',
  ko: 'ko-KR',
};

/** BCP-47 tag for Intl, from an app locale (defaults to the app's). */
export function intlLocale(
  appLocale: string = process.env.NEXT_PUBLIC_APP_LOCALE || 'en'
): string {
  const base = appLocale.toLowerCase().split(/[-_]/)[0];
  return INTL_BY_APP_LOCALE[base] ?? appLocale;
}
