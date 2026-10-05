import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
} from "./level-range";
import { formatGameWindowName, parseRequiredGameWindow } from "./game-window";

export function gameWindowSaveInput(
  day: string,
  startTime: string,
  finishTime: string,
) {
  const gameWindow = parseRequiredGameWindow(day, startTime, finishTime);
  if (!gameWindow) {
    return null;
  }
  return {
    name: formatGameWindowName(day, startTime, finishTime),
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
): GameLevelRangeSave {
  const levelMinTenths = parseLevelBandSelectTenths(levelMin, "min");
  const levelMaxTenths = parseLevelBandSelectTenths(levelMax, "max");
  if (
    levelMinTenths != null &&
    levelMaxTenths != null &&
    levelMinTenths > levelMaxTenths
  ) {
    return { ok: false, message: LEVEL_RANGE_INVERTED_MESSAGE };
  }
  return { ok: true, input: { levelMinTenths, levelMaxTenths } };
}
