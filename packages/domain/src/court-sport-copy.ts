import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type Sport } from "./sport";

export function courtFace(sport: Sport): "court" | "pitch" {
  return sport === "football" ? "pitch" : "court";
}

export function courtCountLabel(count: number, sport: Sport, locale: Locale) {
  const m = messagesFor(locale).createGame.court;
  return courtFace(sport) === "pitch" ? m.pitchCount(count) : m.count(count);
}
