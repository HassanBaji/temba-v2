const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/**
 * Hermes ignores `-u-nu-latn`, so `Intl` output on iOS can carry
 * Arabic-Indic digits ("٨:٢٣ م"). Every product number reads in Latin
 * digits, so formatters pass their result through this.
 */
export function latinDigits(text: string) {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const zero =
      code >= EXTENDED_ARABIC_INDIC_ZERO
        ? EXTENDED_ARABIC_INDIC_ZERO
        : ARABIC_INDIC_ZERO;
    return String(code - zero);
  });
}
