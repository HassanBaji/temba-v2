"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from "react";
import { Direction } from "radix-ui";

import {
  DEFAULT_LOCALE,
  intlLocale,
  isRtl,
  localeDirection,
  type Locale,
  type TextDirection,
} from "@repo/i18n/locale";
import { messagesFor, type Messages } from "@repo/i18n/messages";
import { setLocaleAction } from "~/lib/set-locale-action";

type LocaleContextValue = {
  locale: Locale;
  direction: TextDirection;
  rtl: boolean;
  intlLocale: string;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  switching: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [switching, startTransition] = useTransition();

  const setLocale = useCallback(
    (next: Locale) => {
      startTransition(async () => {
        await setLocaleAction(next);
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction: localeDirection(locale),
      rtl: isRtl(locale),
      intlLocale: intlLocale(locale),
      messages: messagesFor(locale),
      setLocale,
      switching,
    }),
    [locale, setLocale, switching],
  );

  return (
    <LocaleContext.Provider value={value}>
      <Direction.Provider dir={value.direction}>{children}</Direction.Provider>
    </LocaleContext.Provider>
  );
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value) {
    return value;
  }
  return {
    locale: DEFAULT_LOCALE,
    direction: "ltr",
    rtl: false,
    intlLocale: intlLocale(DEFAULT_LOCALE),
    messages: messagesFor(DEFAULT_LOCALE),
    setLocale: () => undefined,
    switching: false,
  };
}

/** The current locale, for domain functions that take one. */
export function useLocale(): Locale {
  return useLocaleContext().locale;
}

/** The message catalog of the current locale: `const m = useMessages()`. */
export function useMessages(): Messages {
  return useLocaleContext().messages;
}

export function useTextDirection() {
  const { direction, rtl } = useLocaleContext();
  return { direction, rtl };
}

export function useLocaleSwitch() {
  const { locale, setLocale, switching } = useLocaleContext();
  return { locale, setLocale, switching };
}
