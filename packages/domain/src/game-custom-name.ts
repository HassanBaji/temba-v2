import { formatGameWindowName, splitGameWindow } from "./game-window";

export const GAME_CUSTOM_NAME_MAX_LENGTH = 60;

export function normalizeGameCustomName(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

/** The name an Organizer chose, or null when the Game carries its window label. */
export function gameCustomName(game: {
  name: string | null | undefined;
  hasCustomName?: boolean | null;
}) {
  return game.hasCustomName ? normalizeGameCustomName(game.name) : null;
}

export function gameWindowLabel(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
) {
  const window = splitGameWindow(windowStart, windowEnd);
  if (!window.day || !window.startTime || !window.finishTime) {
    return null;
  }
  return formatGameWindowName(window.day, window.startTime, window.finishTime);
}
