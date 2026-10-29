export const VERIFICATION_CODE_LENGTH = 6;

const STANDALONE_CODE = /(?:^|\D)(\d{6})(?!\d)/;

/**
 * Reads the code out of whatever lands in the field: typed digits, an OS
 * autofill, or a whole pasted SMS such as "Your Temba code is 123456. It
 * expires in 10 minutes." A standalone six digit run wins, so digits elsewhere
 * in the message ("2FA", "10 minutes") are not glued onto the code.
 */
export function extractVerificationCode(raw: string): string {
  const standalone = STANDALONE_CODE.exec(raw);
  if (standalone?.[1]) {
    return standalone[1];
  }
  return raw.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH);
}

export function isVerificationCodeComplete(code: string): boolean {
  return code.length === VERIFICATION_CODE_LENGTH;
}

/** True when one change filled the code: a paste or an SMS autofill, not a keystroke. */
export function arrivedWhole(previous: string, next: string): boolean {
  return isVerificationCodeComplete(next) && next.length - previous.length > 1;
}
