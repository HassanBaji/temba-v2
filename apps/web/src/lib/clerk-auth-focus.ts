import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import type { Locale } from "@repo/i18n/locale";

export function focusClerkAuthFailure(
  err: unknown,
  fieldElementIds: Record<string, string>,
  summary: HTMLElement | null,
  locale: Locale,
) {
  const split = splitClerkAuthError(err, locale);
  const firstField = Object.keys(split.fieldErrors)[0];
  if (firstField) {
    const elementId = fieldElementIds[firstField] ?? firstField;
    document.getElementById(elementId)?.focus();
    return;
  }
  summary?.focus();
}
