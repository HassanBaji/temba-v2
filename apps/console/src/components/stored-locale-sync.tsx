"use client";

import { useEffect, useRef } from "react";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { useLocale } from "~/components/locale-provider";
import { api } from "~/trpc/react";

/**
 * Mirrors a language switch made in the Venue console onto the User's Stored
 * Locale, so a Notification email is written in it (ADR-0054). The console
 * keeps its own cookie on its own origin, so the Locale it opens in is not a
 * choice: only a switch during the visit is written. Null reads as English.
 */
export function StoredLocaleSync() {
  const locale = useLocale();
  const opened = useRef(locale);
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
    if (
      !stored ||
      stored === locale ||
      locale === opened.current ||
      attempted.current === locale
    ) {
      return;
    }
    attempted.current = locale;
    mutate({ locale });
  }, [locale, mutate, stored]);

  return null;
}
