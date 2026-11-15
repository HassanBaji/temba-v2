import "server-only";

import { cookies, headers } from "next/headers";

import {
  isLocale,
  LOCALE_COOKIE,
  pickLocale,
  type Locale,
} from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/**
 * The locale of this request: the `temba-locale` cookie the language toggle
 * sets, else the browser's `Accept-Language`. Server Components read it here;
 * Client Components read it from `LocaleProvider`.
 */
export async function getRequestLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) {
    return fromCookie;
  }
  return pickLocale((await headers()).get("accept-language"));
}

export async function getRequestMessages() {
  return messagesFor(await getRequestLocale());
}
