import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatAbsoluteDay, formatGameTimeWindow } from "./format-game-start";
import { showsFriendlyRoster } from "./game-summary-cta";
import { formatLevelRangeProseLabel } from "./level-range";

export function genericTembaOpenGraph(locale: Locale) {
  const m = messagesFor(locale).createGame.openGraph;
  return { title: m.genericTitle, description: m.genericDescription };
}

export type GameInviteOpenGraphInput = {
  venueName: string;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  format: string;
  registrationMode: string;
  occupiedCount: number;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  locale: Locale;
};

export function occupiedFriendlyPositions(
  sides: readonly {
    sideIndex: number;
    left: unknown;
    right: unknown;
  }[],
) {
  let occupied = 0;
  for (const side of sides) {
    if (side.sideIndex !== 1 && side.sideIndex !== 2) {
      continue;
    }
    if (side.left) {
      occupied += 1;
    }
    if (side.right) {
      occupied += 1;
    }
  }
  return occupied;
}

function withLevelRange(
  description: string,
  input: Pick<
    GameInviteOpenGraphInput,
    "levelMinTenths" | "levelMaxTenths" | "locale"
  >,
) {
  const range = formatLevelRangeProseLabel(
    input.levelMinTenths,
    input.levelMaxTenths,
    input.locale,
  );
  return range
    ? messagesFor(input.locale).createGame.openGraph.withLevelRange(
        description,
        range,
      )
    : description;
}

export function gameInviteOpenGraphMetadata(input: GameInviteOpenGraphInput) {
  const m = messagesFor(input.locale).createGame.openGraph;
  const start = input.windowStart ?? input.windowEnd;
  if (!start) {
    return {
      title: input.venueName,
      description: withLevelRange(input.venueName, input),
    };
  }
  const day = formatAbsoluteDay(start, input.locale);
  const timeWindow = formatGameTimeWindow(
    input.windowStart,
    input.windowEnd,
    start,
    input.locale,
  );
  if (showsFriendlyRoster(input.format, input.registrationMode)) {
    return {
      title: input.venueName,
      description: withLevelRange(
        m.dayTimeSitting(day, timeWindow, input.occupiedCount),
        input,
      ),
    };
  }
  return {
    title: input.venueName,
    description: withLevelRange(m.dayTime(day, timeWindow), input),
  };
}
