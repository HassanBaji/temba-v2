import {
  CLERK_AUTH_ERROR_COPY,
  GENERIC_CLERK_AUTH_ERROR,
} from "@repo/domain/clerk-auth-error";
import { assembleE164 } from "@repo/domain/phone-number";

import { type SplitFormError } from "../lib/form-error";

export const SOMETHING_WENT_WRONG: SplitFormError = {
  fieldErrors: {},
  globalMessage: GENERIC_CLERK_AUTH_ERROR,
};

const PHONE_FORMAT_MESSAGE =
  CLERK_AUTH_ERROR_COPY.form_param_format_invalid ??
  "That doesn't look right. Check the format and try again.";

export type PhoneResult =
  | { ok: true; e164: string }
  | { ok: false; split: SplitFormError };

export function resolvePhone(
  countryIso: string,
  national: string,
  field: string,
): PhoneResult {
  const assembled = assembleE164(countryIso, national);
  if (assembled.ok) {
    return { ok: true, e164: assembled.e164 };
  }
  return {
    ok: false,
    split: {
      fieldErrors: { [field]: PHONE_FORMAT_MESSAGE },
      globalMessage: null,
    },
  };
}

/** True when a Clerk API error carries the given code, such as `form_identifier_not_found`. */
export function hasClerkErrorCode(err: unknown, code: string): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const { errors } = err as { errors?: unknown };
  return (
    Array.isArray(errors) &&
    errors.some(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        (item as { code?: unknown }).code === code,
    )
  );
}

export type SignUpProgress = {
  status: string | null;
  createdSessionId: string | null;
  missingFields?: string[];
  unverifiedFields?: string[];
};

export type SignUpNextStep =
  | { kind: "complete"; sessionId: string }
  | { kind: "verify-email" }
  | { kind: "verify-phone" }
  | { kind: "fields" }
  | { kind: "stuck" };

export function nextSignUpStep(progress: SignUpProgress): SignUpNextStep {
  if (progress.status === "complete" && progress.createdSessionId) {
    return { kind: "complete", sessionId: progress.createdSessionId };
  }
  if ((progress.missingFields?.length ?? 0) > 0) {
    return { kind: "fields" };
  }
  const unverified = progress.unverifiedFields ?? [];
  if (unverified.includes("email_address")) {
    return { kind: "verify-email" };
  }
  if (unverified.includes("phone_number")) {
    return { kind: "verify-phone" };
  }
  return { kind: "stuck" };
}

export type ContinueValues = {
  emailAddress: string;
  password: string;
  firstName: string;
  lastName: string;
  countryIso: string;
  national: string;
};

export type ContinuePayload = {
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

export function buildContinuePayload(
  missingFields: string[],
  values: ContinueValues,
):
  | { ok: true; payload: ContinuePayload }
  | { ok: false; split: SplitFormError } {
  const payload: ContinuePayload = {};
  if (missingFields.includes("phone_number")) {
    const phone = resolvePhone(
      values.countryIso,
      values.national,
      "phoneNumber",
    );
    if (!phone.ok) {
      return phone;
    }
    payload.phoneNumber = phone.e164;
  }
  if (missingFields.includes("email_address")) {
    payload.emailAddress = values.emailAddress.trim();
  }
  if (missingFields.includes("password")) {
    payload.password = values.password;
  }
  if (missingFields.includes("first_name")) {
    payload.firstName = values.firstName.trim();
  }
  if (missingFields.includes("last_name")) {
    payload.lastName = values.lastName.trim();
  }
  return { ok: true, payload };
}

export function fieldError(
  split: SplitFormError | null,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const message = split?.fieldErrors[key];
    if (message) {
      return message;
    }
  }
  return undefined;
}
