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

export const GENERIC_CLERK_AUTH_ERROR = "Something went wrong. Try again.";

export const CLERK_AUTH_ERROR_COPY: Record<string, string> = {
  form_identifier_not_found:
    "No account matches that. Try a different one, or create an account.",
  form_identifier_exists:
    "An account with that already exists. Sign in instead.",
  form_code_incorrect: "That code is incorrect. Try again.",
  verification_expired: "That code has expired. Request a new one.",
  verification_failed: "Too many incorrect attempts. Try again later.",
  too_many_requests: "Too many attempts. Wait a moment and try again.",
  form_param_format_invalid:
    "That doesn't look right. Check the format and try again.",
  form_password_incorrect: "That password is incorrect.",
  form_password_pwned:
    "That password has appeared in a data breach. Choose a different one.",
};

function clerkErrorCopy(error: ClerkAuthApiError): string {
  return (
    CLERK_AUTH_ERROR_COPY[error.code] ?? error.longMessage ?? error.message
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

export function splitClerkAuthError(err: unknown): SplitClerkAuthError {
  if (!isClerkAuthApiError(err)) {
    return { fieldErrors: {}, globalMessage: GENERIC_CLERK_AUTH_ERROR };
  }

  const fieldErrors: Record<string, string> = {};
  let globalMessage: string | null = null;

  for (const item of err.errors) {
    const message = clerkErrorCopy(item);
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
    globalMessage: globalMessage ?? GENERIC_CLERK_AUTH_ERROR,
  };
}

export function clerkFieldErrorMessage(
  err: unknown,
  field: string,
): string | undefined {
  return splitClerkAuthError(err).fieldErrors[field];
}

export function clerkGlobalErrorMessage(err: unknown): string | null {
  return splitClerkAuthError(err).globalMessage;
}
