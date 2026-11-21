import { SERIES_NAME_MAX_LENGTH } from "@repo/domain/series";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/**
 * A `series.create` refusal that belongs under the name field (the name's own
 * errors from `seriesNameError`), or null when it is shown as a toast.
 */
export function seriesNameFieldError(
  message: string,
  locale: Locale,
): string | null {
  const errors = messagesFor(locale).series.errors;
  const nameErrors = [
    errors.nameRequired,
    errors.nameTooLong(SERIES_NAME_MAX_LENGTH),
    errors.nameTaken,
  ];
  return nameErrors.includes(message) ? message : null;
}
