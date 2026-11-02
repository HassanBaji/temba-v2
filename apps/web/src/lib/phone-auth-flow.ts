/**
 * The one phone door on `/login`: a number first. A known number signs in
 * with its password; a new one gets a code, then a name and a password
 * (ADR-0049, ADR-0050). Clerk does the work; these helpers keep the step
 * logic pure.
 */
export type PhoneAuthStep =
  | "phone"
  | "password"
  | "code"
  | "name"
  | "new-password";

type FirstFactorLike = {
  strategy: string;
};

/** Whether Clerk offers the password as a first factor for a known number. */
export function hasPasswordFactor(
  factors: readonly FirstFactorLike[] | null | undefined,
): boolean {
  return factors?.some((item) => item.strategy === "password") ?? false;
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
    case "password":
    case "code":
    case "name":
      return "phone";
    case "new-password":
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
  if (step === "new-password") {
    return { step: 2, total: 2 };
  }
  return undefined;
}

export const PHONE_AUTH_TITLES: Record<PhoneAuthStep, string> = {
  phone: "What's your number?",
  password: "Enter your password",
  code: "Enter the code",
  name: "What should we call you?",
  "new-password": "Pick a password",
};
