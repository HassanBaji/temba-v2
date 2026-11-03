import { intlLocale, type Locale } from "./locale";

/**
 * One form per CLDR plural category. English uses `one` and `other`; Arabic
 * uses all six (0, 1, 2, 3–10, 11–99, 100+). Missing forms fall back to
 * `other`. `{n}` in a form is replaced with the count.
 */
export type PluralForms = {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

const rules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale) {
  let found = rules.get(locale);
  if (!found) {
    found = new Intl.PluralRules(intlLocale(locale));
    rules.set(locale, found);
  }
  return found;
}

export function plural(locale: Locale, count: number, forms: PluralForms) {
  const category = rulesFor(locale).select(count);
  const form = forms[category] ?? forms.other;
  return form.replaceAll("{n}", String(count));
}
