import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";

import {
  isLocale,
  LOCALE_STORAGE_KEY,
  pickLocale,
  type Locale,
} from "@repo/i18n/locale";

/** The locale the User chose, else the first device language Temba speaks. */
export async function loadLocale(): Promise<Locale> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    // Storage is unavailable: fall through to the device language.
  }
  return deviceLocale();
}

export function deviceLocale(): Locale {
  return pickLocale(getLocales().map((entry) => entry.languageTag));
}

export async function storeLocale(locale: Locale) {
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The choice holds for this launch only.
  }
}
