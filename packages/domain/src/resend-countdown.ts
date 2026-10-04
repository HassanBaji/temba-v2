/**
 * Resend cooldown for auth verification codes.
 *
 * Clerk's Dashboard rate limit is not readable from this environment.
 * Clerk documents a 30s resend cooldown on email/SMS OTP in prebuilt
 * components (https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).
 * The artboard draws 24s. Use the larger of the two so the control does not
 * unlock into `too_many_requests`.
 */
export const RESEND_COUNTDOWN_SECONDS = 30;

export function remainingSeconds(
  startedAtMs: number,
  nowMs: number,
  durationSeconds: number = RESEND_COUNTDOWN_SECONDS,
): number {
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.max(0, durationSeconds - elapsed);
}

export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60);
  const rest = clamped % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function isResendAvailable(secondsRemaining: number): boolean {
  return secondsRemaining <= 0;
}

export function resendAccessibleName(secondsRemaining: number): string {
  if (isResendAvailable(secondsRemaining)) {
    return "Resend code";
  }
  const unit = secondsRemaining === 1 ? "second" : "seconds";
  return `Resend code, available in ${secondsRemaining} ${unit}`;
}
