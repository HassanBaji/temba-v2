import { TRPCError } from "@trpc/server";

import { assembleE164 } from "@repo/domain/phone-number";

const REASON_MESSAGE = {
  unknown_country: "Pick a supported country code",
  malformed: "Enter the full phone number",
} as const;

export function requireE164(countryIso: string, nationalNumber: string) {
  const assembled = assembleE164(countryIso, nationalNumber);
  if (!assembled.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: REASON_MESSAGE[assembled.reason],
    });
  }
  return assembled.e164;
}
