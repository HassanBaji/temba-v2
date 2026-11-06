import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_APPEARANCE,
  isAppearance,
  type Appearance,
} from "./appearance";

const APPEARANCE_STORAGE_KEY = "temba.appearance";

/** Appearance is per device, so it lives in local storage, not the account. */
export async function loadAppearance(): Promise<Appearance> {
  try {
    const stored = await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (isAppearance(stored)) {
      return stored;
    }
  } catch {
    // Storage is unavailable: follow the phone.
  }
  return DEFAULT_APPEARANCE;
}

export async function storeAppearance(appearance: Appearance) {
  try {
    await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
  } catch {
    // The choice holds for this launch only.
  }
}
