import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";

export function focusClerkAuthFailure(
  err: unknown,
  fieldElementIds: Record<string, string>,
  summary: HTMLElement | null,
) {
  const split = splitClerkAuthError(err);
  const firstField = Object.keys(split.fieldErrors)[0];
  if (firstField) {
    const elementId = fieldElementIds[firstField] ?? firstField;
    document.getElementById(elementId)?.focus();
    return;
  }
  summary?.focus();
}
