import { useEffect, useRef } from "react";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { api } from "../trpc/react";
import { useLocale } from "./locale-provider";

/**
 * Mirrors the Locale the mobile App shows onto the User's Stored Locale, so a
 * Notification email is written in it (ADR-0054). Writes only when the two
 * differ: on app load and after a language switch. Null reads as English.
 */
export function StoredLocaleSync() {
  const locale = useLocale();
  const utils = api.useUtils();
  const details = api.users.profileDetails.useQuery();
  const attempted = useRef<Locale | null>(null);
  const save = api.users.setLocale.useMutation({
    onSuccess: ({ locale: stored }) => {
      utils.users.profileDetails.setData(undefined, (old) =>
        old ? { ...old, locale: stored } : old,
      );
    },
  });
  const stored = details.data ? (details.data.locale ?? DEFAULT_LOCALE) : null;
  const { mutate } = save;

  useEffect(() => {
    if (!stored || stored === locale || attempted.current === locale) {
      return;
    }
    attempted.current = locale;
    mutate({ locale });
  }, [locale, mutate, stored]);

  return null;
}
