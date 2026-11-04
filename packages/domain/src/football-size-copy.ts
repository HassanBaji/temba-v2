import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { sideSizeLabel } from "./game-shape";

export function footballSizeLabel(
  sideSize: number,
  playersAllowed: number,
  locale: Locale,
) {
  return messagesFor(locale).football.sizeLine(
    sideSizeLabel(sideSize, locale),
    playersAllowed,
  );
}
