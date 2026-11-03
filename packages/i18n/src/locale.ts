/**
 * The two languages the product is written in. `en` is the source language:
 * every message is written in English first and the Arabic catalog must
 * carry the same keys (`messages.test.ts` walks both).
 */
export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "temba-locale";

export const LOCALE_STORAGE_KEY = "temba.locale";

export type TextDirection = "ltr" | "rtl";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

export function localeDirection(locale: Locale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isRtl(locale: Locale): boolean {
  return localeDirection(locale) === "rtl";
}

/**
 * The BCP 47 tag handed to `Intl`. Arabic keeps Latin digits (`nu-latn`) so
 * scores, prices and Levels read the same in both languages and keep the
 * tabular figures the type system relies on.
 */
export function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-BH-u-nu-latn" : "en-US";
}

/** The language's own name, for a language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/**
 * Picks a supported locale from an `Accept-Language` header or a device
 * language tag list. Arabic in any region wins when it is the first match.
 */
export function pickLocale(
  languageTags: readonly string[] | string | null | undefined,
): Locale {
  const tags =
    typeof languageTags === "string"
      ? languageTags.split(",").map((part) => part.split(";")[0]?.trim() ?? "")
      : (languageTags ?? []);
  for (const tag of tags) {
    const language = tag.toLowerCase().split("-")[0];
    if (isLocale(language)) {
      return language;
    }
  }
  return DEFAULT_LOCALE;
}
