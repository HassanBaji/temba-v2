import { TRPCError } from "@trpc/server";

import { assembleE164 } from "@repo/domain/phone-number";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function requireE164(
  countryIso: string,
  nationalNumber: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const assembled = assembleE164(countryIso, nationalNumber);
  if (!assembled.ok) {
    const errors = messagesFor(locale).profile.errors;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        assembled.reason === "unknown_country"
          ? errors.unknownCountry
          : errors.malformedPhone,
    });
  }
  return assembled.e164;
}
