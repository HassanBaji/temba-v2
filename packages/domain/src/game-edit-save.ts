import type { Locale } from "@repo/i18n/locale";

import {
  levelRangeInvertedMessage,
  parseLevelBandSelectTenths,
} from "./level-range";
import { formatGameWindowName, parseRequiredGameWindow } from "./game-window";

export function gameWindowSaveInput(
  day: string,
  startTime: string,
  finishTime: string,
  locale: Locale,
) {
  const gameWindow = parseRequiredGameWindow(day, startTime, finishTime);
  if (!gameWindow) {
    return null;
  }
  return {
    name: formatGameWindowName(day, startTime, finishTime, locale),
    windowStart: gameWindow.windowStart,
    windowEnd: gameWindow.windowEnd,
  };
}

export type GameLevelRangeSave =
  | {
      ok: true;
      input: { levelMinTenths: number | null; levelMaxTenths: number | null };
    }
  | { ok: false; message: string };

export function gameLevelRangeSaveInput(
  levelMin: string,
  levelMax: string,
  locale: Locale,
): GameLevelRangeSave {
  const levelMinTenths = parseLevelBandSelectTenths(levelMin, "min");
  const levelMaxTenths = parseLevelBandSelectTenths(levelMax, "max");
  if (
    levelMinTenths != null &&
    levelMaxTenths != null &&
    levelMinTenths > levelMaxTenths
  ) {
    return { ok: false, message: levelRangeInvertedMessage(locale) };
  }
  return { ok: true, input: { levelMinTenths, levelMaxTenths } };
}
