export const PASSWORD_MIN_LENGTH = 8;

/** Length past which the last strength segment fills. */
const STRONG_PASSWORD_LENGTH = 12;

export const PASSWORD_STRENGTH_SEGMENTS = 4;

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters. Mix in a number or symbol to make it strong.`;

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

const STRENGTH_LABELS = [
  "Too short",
  "Weak",
  "Fair",
  "Good",
  "Strong",
] as const;

export function passwordStrengthLabel(password: string): string {
  if (!isPasswordLongEnough(password)) {
    return STRENGTH_LABELS[0];
  }
  return STRENGTH_LABELS[passwordStrength(password)] ?? STRENGTH_LABELS[0];
}
