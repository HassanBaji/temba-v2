/**
 * The one phone door on `/login`: a number, then its code. A known number is
 * signed in from the code; a new one continues to a name and a password
 * (ADR-0049). Clerk does the work; these helpers keep the step logic pure.
 */
export type PhoneAuthStep = "phone" | "code" | "name" | "password";

export type PhoneAuthMode = "sign-in" | "sign-up";

type FirstFactorLike = {
  strategy: string;
  phoneNumberId?: string;
  safeIdentifier?: string;
};

export type PhoneCodeFactor = {
  strategy: "phone_code";
  phoneNumberId: string;
};

/** The `phone_code` first factor Clerk offers for a known number, if any. */
export function phoneCodeFactor(
  factors: readonly FirstFactorLike[] | null | undefined,
): PhoneCodeFactor | null {
  const factor = factors?.find((item) => item.strategy === "phone_code");
  if (!factor?.phoneNumberId) {
    return null;
  }
  return { strategy: "phone_code", phoneNumberId: factor.phoneNumberId };
}

/**
 * Where Back goes from each step. The code is spent once verified, so from
 * the name step Back returns to the number, not to the code.
 */
export function previousPhoneAuthStep(
  step: PhoneAuthStep,
): PhoneAuthStep | null {
  switch (step) {
    case "phone":
      return null;
    case "code":
    case "name":
      return "phone";
    case "password":
      return "name";
  }
}

/** The "STEP n OF 2" counter shown on the two sign-up-only steps. */
export function signUpStepProgress(
  step: PhoneAuthStep,
): { step: number; total: number } | undefined {
  if (step === "name") {
    return { step: 1, total: 2 };
  }
  if (step === "password") {
    return { step: 2, total: 2 };
  }
  return undefined;
}

export const PHONE_AUTH_TITLES: Record<PhoneAuthStep, string> = {
  phone: "What's your number?",
  code: "Enter the code",
  name: "What should we call you?",
  password: "Pick a password",
};
