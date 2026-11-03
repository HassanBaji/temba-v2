import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type UserNames = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
};

function clean(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * "First Last" when both are present, one of them when only one is, null when
 * the User has no name on file. Callers fall back to the username, then the
 * stored `name` (ADR-0049).
 */
export function userDisplayName(names: UserNames): string | null {
  const parts = [clean(names.firstName), clean(names.lastName)].filter(
    (part): part is string => part !== null,
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

/** True when both a first and a last name are on file: the required state. */
export function hasFullName(names: UserNames): boolean {
  return clean(names.firstName) !== null && clean(names.lastName) !== null;
}

export const USER_NAME_MAX_LENGTH = 60;

export type NameFieldErrors = Partial<Record<"firstName" | "lastName", string>>;

/**
 * Validate the two name fields the way every name form does: trimmed,
 * non-empty, within the length bound. Returns the cleaned names or the
 * field errors to show.
 */
export function validateUserNames(
  input: UserNames,
  locale: Locale,
):
  | { ok: true; firstName: string; lastName: string }
  | { ok: false; fieldErrors: NameFieldErrors } {
  const m = messagesFor(locale).group.userName;
  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);
  const fieldErrors: NameFieldErrors = {};
  if (!firstName) {
    fieldErrors.firstName = m.firstRequired;
  } else if (firstName.length > USER_NAME_MAX_LENGTH) {
    fieldErrors.firstName = m.tooLong(USER_NAME_MAX_LENGTH);
  }
  if (!lastName) {
    fieldErrors.lastName = m.lastRequired;
  } else if (lastName.length > USER_NAME_MAX_LENGTH) {
    fieldErrors.lastName = m.tooLong(USER_NAME_MAX_LENGTH);
  }
  if (!firstName || !lastName || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, firstName, lastName };
}
