import { plural } from "../../plural";

export const auth = {
  clerkError: {
    generic: "Something went wrong. Try again.",
    identifierNotFound:
      "No account matches that. Try a different one, or create an account.",
    identifierExists: "An account with that already exists. Sign in instead.",
    codeIncorrect: "That code is incorrect. Try again.",
    verificationExpired: "That code has expired. Request a new one.",
    verificationFailed: "Too many incorrect attempts. Try again later.",
    tooManyRequests: "Too many attempts. Wait a moment and try again.",
    paramFormatInvalid:
      "That doesn't look right. Check the format and try again.",
    passwordIncorrect: "That password is incorrect.",
    passwordPwned:
      "That password has appeared in a data breach. Choose a different one.",
  },
  /** Stored as the name of a User whose Clerk account was deleted. */
  deletedAccountName: "Deleted player",
  country: {
    bh: "Bahrain",
    kw: "Kuwait",
    sa: "Saudi Arabia",
    ae: "United Arab Emirates",
    qa: "Qatar",
    om: "Oman",
    us: "United States",
  },
  resendCode: "Resend code",
  resendCodeAvailableIn: (seconds: number) =>
    plural("en", seconds, {
      one: "Resend code, available in 1 second",
      other: "Resend code, available in {n} seconds",
    }),
  errors: {
    levelSetterOnly: "Only Level setters can set a Level",
    operatorOnly: "Only Operators can do this",
  },
};
