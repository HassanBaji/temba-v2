import { noneSender } from "./none";
import { createResendSender } from "./resend";
import type { EmailSender } from "./sender";

let override: EmailSender | null = null;
let resendSender: EmailSender | null = null;

function resendFromEnv(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "EMAIL_PROVIDER=resend needs RESEND_API_KEY and EMAIL_FROM",
    );
  }
  return createResendSender({ apiKey, from });
}

export function setEmailSender(sender: EmailSender): void {
  override = sender;
}

export function resetEmailSender(): void {
  override = null;
  resendSender = null;
}

/** The one seam every email leaves through (ADR-0054); `none` until an Operator configures a provider. */
export function emailSender(): EmailSender {
  if (override) {
    return override;
  }
  const chosen = process.env.EMAIL_PROVIDER ?? "";
  if (chosen === "" || chosen === "none") {
    return noneSender;
  }
  if (chosen === "resend") {
    resendSender ??= resendFromEnv();
    return resendSender;
  }
  throw new Error(`EMAIL_PROVIDER "${chosen}" has no adapter`);
}
