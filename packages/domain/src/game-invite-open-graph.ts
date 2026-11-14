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
  groupName?: string | null;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  format: string;
  registrationMode: string;
  occupiedCount: number;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  /** A football Game reads its range in OVR. */
  sport?: string | null;
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
    "levelMinTenths" | "levelMaxTenths" | "sport" | "locale"
  >,
) {
  const range = formatLevelRangeProseLabel(
    input.levelMinTenths,
    input.levelMaxTenths,
    input.locale,
    input.sport,
  );
  return range
    ? messagesFor(input.locale).createGame.openGraph.withLevelRange(
        description,
        range,
      )
    : description;
}

export function gameInviteOpenGraphMetadata(input: GameInviteOpenGraphInput) {
  const schedule = scheduleDetails(input);
  const groupName = nonBlank(input.groupName);
  if (!schedule) {
    return {
      title: groupName ?? input.venueName,
      description: withLevelRange(input.venueName, input),
    };
  }
  if (!groupName) {
    return { title: input.venueName, description: schedule };
  }
  return {
    title: groupName,
    description: messagesFor(input.locale).createGame.openGraph.atVenue(
      input.venueName,
      schedule,
    ),
  };
}

function nonBlank(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function scheduleDetails(input: GameInviteOpenGraphInput) {
  const start = input.windowStart ?? input.windowEnd;
  if (!start) {
    return null;
  }
  const m = messagesFor(input.locale).createGame.openGraph;
  const day = formatAbsoluteDay(start, input.locale);
  const timeWindow = formatGameTimeWindow(
    input.windowStart,
    input.windowEnd,
    start,
    input.locale,
  );
  const description = showsFriendlyRoster(input.format, input.registrationMode)
    ? m.dayTimeSitting(day, timeWindow, input.occupiedCount)
    : m.dayTime(day, timeWindow);
  return withLevelRange(description, input);
}
