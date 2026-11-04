import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

const DEFAULT_MIME_TYPE = "image/jpeg";

export function imageDataUri(base64: string, mimeType?: string | null) {
  return `data:${mimeType ?? DEFAULT_MIME_TYPE};base64,${base64}`;
}

export function photoErrorMessage(error: unknown, locale: Locale): string {
  const { fieldErrors, globalMessage } = splitClerkAuthError(error, locale);
  return (
    globalMessage ??
    Object.values(fieldErrors)[0] ??
    messagesFor(locale).common.somethingWentWrong
  );
}
