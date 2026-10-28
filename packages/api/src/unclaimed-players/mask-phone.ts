import { callingCountryByIso, parseE164 } from "@repo/domain/phone-number";

const MASK = "••••";

export function maskPhone(e164: string): string {
  const lastFour = e164.slice(-4);
  const parsed = parseE164(e164);
  const country = parsed ? callingCountryByIso(parsed.iso) : undefined;
  return country
    ? `+${country.callingCode} ${MASK} ${lastFour}`
    : `${MASK} ${lastFour}`;
}
