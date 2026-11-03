import type { Locale } from "@repo/i18n/locale";
import { messagesFor, type Messages } from "@repo/i18n/messages";

export type SplitClerkAuthError = {
  fieldErrors: Record<string, string>;
  globalMessage: string | null;
};

type ClerkAuthApiError = {
  code: string;
  message: string;
  longMessage?: string | null;
  meta?: { paramName?: string };
};

type ClerkErrorKey = keyof Messages["auth"]["clerkError"];

const CLERK_ERROR_KEYS: Record<string, ClerkErrorKey> = {
  form_identifier_not_found: "identifierNotFound",
  form_identifier_exists: "identifierExists",
  form_code_incorrect: "codeIncorrect",
  verification_expired: "verificationExpired",
  verification_failed: "verificationFailed",
  too_many_requests: "tooManyRequests",
  form_param_format_invalid: "paramFormatInvalid",
  form_password_incorrect: "passwordIncorrect",
  form_password_pwned: "passwordPwned",
};

/** Temba copy for a Clerk error code, or null when Clerk's own message stands. */
export function clerkAuthErrorCopy(
  code: string,
  locale: Locale,
): string | null {
  const key = CLERK_ERROR_KEYS[code];
  return key ? messagesFor(locale).auth.clerkError[key] : null;
}

function clerkErrorCopy(error: ClerkAuthApiError, locale: Locale): string {
  return (
    clerkAuthErrorCopy(error.code, locale) ?? error.longMessage ?? error.message
  );
}

function isClerkAuthApiError(
  err: unknown,
): err is { errors: ClerkAuthApiError[] } {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const { clerkError, errors } = err as {
    clerkError?: unknown;
    errors?: unknown;
  };
  return (
    clerkError === true &&
    Array.isArray(errors) &&
    (errors as Array<Partial<ClerkAuthApiError> | null>).every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.code === "string" &&
        typeof item.message === "string",
    )
  );
}

export function splitClerkAuthError(
  err: unknown,
  locale: Locale,
): SplitClerkAuthError {
  const generic = messagesFor(locale).auth.clerkError.generic;
  if (!isClerkAuthApiError(err)) {
    return { fieldErrors: {}, globalMessage: generic };
  }

  const fieldErrors: Record<string, string> = {};
  let globalMessage: string | null = null;

  for (const item of err.errors) {
    const message = clerkErrorCopy(item, locale);
    const paramName = item.meta?.paramName;
    if (paramName) {
      fieldErrors[paramName] ??= message;
      continue;
    }
    globalMessage ??= message;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, globalMessage: null };
  }

  return {
    fieldErrors: {},
    globalMessage: globalMessage ?? generic,
  };
}

export function clerkFieldErrorMessage(
  err: unknown,
  field: string,
  locale: Locale,
): string | undefined {
  return splitClerkAuthError(err, locale).fieldErrors[field];
}

export function clerkGlobalErrorMessage(
  err: unknown,
  locale: Locale,
): string | null {
  return splitClerkAuthError(err, locale).globalMessage;
}
