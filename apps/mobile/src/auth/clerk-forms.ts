import {
  CLERK_AUTH_ERROR_COPY,
  GENERIC_CLERK_AUTH_ERROR,
  splitClerkAuthError,
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

export type IdentifierMode = "username" | "phone";

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

export function resolveSignInIdentifier(input: {
  mode: IdentifierMode;
  username: string;
  countryIso: string;
  national: string;
}): { ok: true; identifier: string } | { ok: false; split: SplitFormError } {
  if (input.mode === "username") {
    return { ok: true, identifier: input.username.trim() };
  }
  const phone = resolvePhone(input.countryIso, input.national, "identifier");
  return phone.ok
    ? { ok: true, identifier: phone.e164 }
    : { ok: false, split: phone.split };
}

export function splitSignInError(err: unknown): SplitFormError {
  const split = splitClerkAuthError(err);
  const notFound = CLERK_AUTH_ERROR_COPY.form_identifier_not_found;
  if (notFound && split.fieldErrors.identifier === notFound) {
    const rest = { ...split.fieldErrors };
    delete rest.identifier;
    return { fieldErrors: rest, globalMessage: notFound };
  }
  return split;
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
  username: string;
  emailAddress: string;
  password: string;
  firstName: string;
  lastName: string;
  countryIso: string;
  national: string;
};

export type ContinuePayload = {
  username?: string;
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
  if (missingFields.includes("username")) {
    payload.username = values.username.trim();
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

export const CODE_LENGTH = 6;

export function isCodeComplete(code: string): boolean {
  return code.length === CODE_LENGTH;
}

export function sanitizeCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
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
