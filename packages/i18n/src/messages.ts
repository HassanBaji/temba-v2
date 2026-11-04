import { ar } from "./messages/ar/index";
import { en } from "./messages/en/index";
import { type Locale } from "./locale";

/**
 * The catalog shape is the English catalog. Leaves are strings, or functions
 * of their variables that return a string. Read a message by property access
 * (`messagesFor(locale).game.joinAction`): there is no key-string lookup.
 */
export type Messages = typeof en;

const catalogs: Record<Locale, Messages> = { en, ar };

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale];
}
