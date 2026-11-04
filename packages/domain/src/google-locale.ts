import type { Locale } from "@repo/i18n/locale";

/**
 * Google picks its page language from the browser, not from Temba, so an
 * Arabic customer on an English phone would land on English Google pages.
 * `hl` overrides that. English is left alone so the browser still decides.
 */
export function withGoogleLocale(url: string, locale: Locale): string {
  if (locale !== "ar") {
    return url;
  }
  const localized = new URL(url);
  localized.searchParams.set("hl", locale);
  return localized.toString();
}
