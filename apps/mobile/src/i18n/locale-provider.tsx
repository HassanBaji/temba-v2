import * as SplashScreen from "expo-splash-screen";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { I18nManager } from "react-native";

import {
  DEFAULT_LOCALE,
  intlLocale,
  isRtl,
  type Locale,
} from "@repo/i18n/locale";
import { messagesFor, type Messages } from "@repo/i18n/messages";
import { loadLocale, storeLocale } from "./locale-store";

type LocaleContextValue = {
  locale: Locale;
  intlLocale: string;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  /**
   * React Native mirrors the layout from `I18nManager.isRTL`, which only
   * changes on the next launch. True while the chosen language and the live
   * layout direction disagree, so a screen can ask for a restart.
   */
  restartNeeded: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function alignLayoutDirection(locale: Locale) {
  const wantRtl = isRtl(locale);
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== wantRtl) {
    I18nManager.forceRTL(wantRtl);
  }
  return I18nManager.isRTL !== wantRtl;
}

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale | null>(null);
  const [restartNeeded, setRestartNeeded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadLocale().then((loaded) => {
      if (cancelled) {
        return;
      }
      setRestartNeeded(alignLayoutDirection(loaded));
      setLocaleState(loaded);
      void SplashScreen.hideAsync().catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setRestartNeeded(alignLayoutDirection(next));
    void storeLocale(next);
  }, []);

  const value = useMemo<LocaleContextValue | null>(
    () =>
      locale
        ? {
            locale,
            intlLocale: intlLocale(locale),
            messages: messagesFor(locale),
            setLocale,
            restartNeeded,
          }
        : null,
    [locale, restartNeeded, setLocale],
  );

  if (!value) {
    return null;
  }
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value) {
    return value;
  }
  return {
    locale: DEFAULT_LOCALE,
    intlLocale: intlLocale(DEFAULT_LOCALE),
    messages: messagesFor(DEFAULT_LOCALE),
    setLocale: () => undefined,
    restartNeeded: false,
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

export function useLocaleSwitch() {
  const { locale, setLocale, restartNeeded } = useLocaleContext();
  return { locale, setLocale, restartNeeded };
}
