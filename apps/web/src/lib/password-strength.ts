import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const PASSWORD_MIN_LENGTH = 8;

/** Length past which the last strength segment fills. */
const STRONG_PASSWORD_LENGTH = 12;

export const PASSWORD_STRENGTH_SEGMENTS = 4;

export function passwordHint(locale: Locale): string {
  return messagesFor(locale).webUi.password.hint(PASSWORD_MIN_LENGTH);
}

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

/**
 * How many of the four strength segments to fill: minimum length, a digit, a
 * symbol, and a longer password each add one. The meter is a hint; only the
 * minimum length gates the button.
 */
export function passwordStrength(password: string): number {
  if (password.length === 0) {
    return 0;
  }
  const checks = [
    isPasswordLongEnough(password),
    /\d/.test(password),
    /[^\p{L}\p{N}]/u.test(password),
    password.length >= STRONG_PASSWORD_LENGTH,
  ];
  return checks.filter(Boolean).length;
}

export function passwordStrengthLabel(
  password: string,
  locale: Locale,
): string {
  const m = messagesFor(locale).webUi.password;
  const labels = [m.tooShort, m.weak, m.fair, m.good, m.strong] as const;
  if (!isPasswordLongEnough(password)) {
    return labels[0];
  }
  return labels[passwordStrength(password)] ?? labels[0];
}
