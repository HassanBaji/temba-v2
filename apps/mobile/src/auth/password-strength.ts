export const PASSWORD_MIN_LENGTH = 8;
const STRONG_LENGTH = 12;

/**
 * The four strength segments under the password field: length, a number, a
 * symbol, and a longer length. Each is a hint, not a rule; only the minimum
 * length gates the button.
 */
export function passwordStrength(password: string): boolean[] {
  return [
    password.length >= PASSWORD_MIN_LENGTH,
    /\d/.test(password),
    /[^A-Za-z0-9\s]/.test(password),
    password.length >= STRONG_LENGTH,
  ];
}

export function passwordMeetsMinimum(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}
