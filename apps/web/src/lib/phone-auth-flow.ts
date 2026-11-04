/**
 * The one phone door on `/login`: a number first. A known number signs in
 * with its password; a new one gets a code, then a name and a password
 * (ADR-0049, ADR-0050). A forgotten password is reset with a code, then a new
 * password (ADR-0051). Clerk does the work; these helpers keep the step logic
 * pure.
 */
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type PhoneAuthStep =
  | "phone"
  | "password"
  | "code"
  | "name"
  | "new-password"
  | "reset-code"
  | "reset-password";

type FirstFactorLike = {
  strategy: string;
  phoneNumberId?: string;
};

/** Whether Clerk offers the password as a first factor for a known number. */
export function hasPasswordFactor(
  factors: readonly FirstFactorLike[] | null | undefined,
): boolean {
  return factors?.some((item) => item.strategy === "password") ?? false;
}

/**
 * The phone number Clerk will text a reset code to, from the known number's
 * first factors. Null when the account cannot reset its password by SMS.
 */
export function resetPasswordPhoneNumberId(
  factors: readonly FirstFactorLike[] | null | undefined,
): string | null {
  const factor = factors?.find(
    (item) => item.strategy === "reset_password_phone_code",
  );
  return factor?.phoneNumberId ?? null;
}

/**
 * Where Back goes from each step. A code is spent once verified, so from the
 * name step and the new-password-after-reset step Back returns to the number,
 * not to the code.
 */
export function previousPhoneAuthStep(
  step: PhoneAuthStep,
): PhoneAuthStep | null {
  switch (step) {
    case "phone":
      return null;
    case "password":
    case "code":
    case "name":
    case "reset-password":
      return "phone";
    case "new-password":
      return "name";
    case "reset-code":
      return "password";
  }
}

/** The "STEP n OF 2" counter shown on the two sign-up-only steps. */
export function signUpStepProgress(
  step: PhoneAuthStep,
): { step: number; total: number } | undefined {
  if (step === "name") {
    return { step: 1, total: 2 };
  }
  if (step === "new-password") {
    return { step: 2, total: 2 };
  }
  return undefined;
}

export function phoneAuthTitle(step: PhoneAuthStep, locale: Locale): string {
  const m = messagesFor(locale).webUi.phoneAuth;
  switch (step) {
    case "phone":
      return m.phone;
    case "password":
      return m.password;
    case "code":
      return m.code;
    case "name":
      return m.name;
    case "new-password":
      return m.newPassword;
    case "reset-code":
      return m.resetCode;
    case "reset-password":
      return m.resetPassword;
  }
}
