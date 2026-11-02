import {
  formatInternationalNumber,
  parseE164,
} from "@repo/domain/phone-number";

/** A stored E.164 number as the forms show it, or the raw value when unknown. */
export function formatPhoneForDisplay(e164: string | null | undefined) {
  if (!e164) {
    return null;
  }
  const parsed = parseE164(e164);
  return parsed ? formatInternationalNumber(parsed.iso, parsed.national) : e164;
}
