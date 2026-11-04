import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
  locale: Locale,
) {
  const window = splitGameWindow(windowStart, windowEnd);
  if (!window.day || !window.startTime || !window.finishTime) {
    return null;
  }
  return formatGameWindowName(
    window.day,
    window.startTime,
    window.finishTime,
    locale,
  );
}

export type GameDisplayNameInput = {
  name: string | null | undefined;
  hasCustomName?: boolean | null;
  format: string;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
};

/**
 * A Friendly game without a custom name stores its window label in the
 * creator's locale, so the label is rebuilt in the viewer's locale. Other
 * formats store the Organizer's name without setting `hasCustomName`.
 */
export function gameDisplayName(game: GameDisplayNameInput, locale: Locale) {
  const windowLabel =
    game.format === "friendly_game"
      ? gameWindowLabel(game.windowStart, game.windowEnd, locale)
      : null;
  return (
    gameCustomName(game) ??
    windowLabel ??
    normalizeGameCustomName(game.name) ??
    messagesFor(locale).game.window.fallbackTitle
  );
}
