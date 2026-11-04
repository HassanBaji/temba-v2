import {
  createGameTypeCards,
  createFlowLaterSteps,
  type CreateFlowStep,
  type CreateGameTypeId,
} from "@repo/domain/create-game-flow";
import {
  formatDayLabel,
  formatTimeSlotLabel,
  parseGameDateTime,
} from "@repo/domain/game-window";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import {
  courtCountValue,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
} from "@repo/domain/tournament-sizing";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";

import type { CreateState } from "./create-model";
import { matchCountLabel } from "./create-summary";

export type HeaderContextIcon = "users" | "trophy" | "lock";

export type KickoffHero = {
  value: string;
  unit: string;
  trailing: string | null;
};

export type StepHeaderText = {
  title: readonly string[];
  hero?: KickoffHero;
  subtitle: string | null;
  context: {
    icon?: HeaderContextIcon;
    parts: readonly string[];
    /** One part per line instead of a single separated row. */
    stacked?: boolean;
  } | null;
};

function titleLines(title: string): string[] {
  return title.split("\n");
}

export function createEntryHeader(locale: Locale): StepHeaderText {
  return {
    title: titleLines(messagesFor(locale).mobileCreateGame.entryTitle),
    subtitle: null,
    context: null,
  };
}

export type StepHeaderContext = {
  groupName: string | null;
  venues: { locked: boolean; count: number } | null;
};

function tournamentRating(locale: Locale) {
  return (
    createGameTypeCards(locale).find(
      (card) => card.id === "friendly_tournament",
    )?.rating ?? ""
  );
}

function venueCountPart(
  venues: { locked: boolean; count: number },
  locale: Locale,
) {
  const m = messagesFor(locale).mobileCreateGame.header;
  if (venues.locked) {
    return m.linkedVenue;
  }
  return m.venueCount(venues.count);
}

export function stepHeader(
  state: Pick<CreateState, "type" | "step"> & { sport?: Sport },
  context: StepHeaderContext,
  locale: Locale,
): StepHeaderText | null {
  const messages = messagesFor(locale);
  const m = messages.mobileCreateGame.header;
  if (state.step === 1) {
    return {
      title: titleLines(m.whatTitle),
      subtitle: m.whatSubtitle,
      context: null,
    };
  }
  if (state.step !== 2) {
    return null;
  }
  if (state.type === "friendly_tournament") {
    return {
      title: titleLines(m.tournamentTitle),
      subtitle: null,
      context: {
        icon: "trophy",
        parts: [
          tournamentRating(locale),
          m.teamRange(TOURNAMENT_TEAM_MIN, TOURNAMENT_TEAM_MAX),
        ],
      },
    };
  }
  if (!context.groupName) {
    return {
      title: titleLines(m.gameTitle),
      subtitle: m.startWithGroup,
      context: null,
    };
  }
  const sportPart =
    state.sport === "football" ? [messages.common.football] : [];
  return {
    title: titleLines(m.gameTitle),
    subtitle: null,
    context: {
      icon: "users",
      parts: context.venues
        ? [
            context.groupName,
            ...sportPart,
            venueCountPart(context.venues, locale),
          ]
        : [context.groupName, ...sportPart],
    },
  };
}

export function nextStepTitle(
  type: CreateGameTypeId | null,
  step: CreateFlowStep,
  locale: Locale,
  sport: Sport = DEFAULT_SPORT,
): string | null {
  return (
    createFlowLaterSteps(type, locale, sport).find(
      (item) => item.step === step + 1,
    )?.title ?? null
  );
}

export function kickoffHero(
  day: string,
  startTime: string,
  finishTime: string,
  locale: Locale,
): KickoffHero | null {
  const startsAt = startTime ? parseGameDateTime(day, startTime) : undefined;
  if (!startsAt) {
    return null;
  }
  const { time, meridiem } = formatHomeKickoff(startsAt, locale);
  const endsAt = finishTime ? parseGameDateTime(day, finishTime) : undefined;
  return {
    value: time,
    unit: meridiem,
    trailing:
      endsAt && endsAt.getTime() > startsAt.getTime()
        ? messagesFor(locale).mobileCreateGame.header.toTime(
            formatTimeSlotLabel(finishTime, locale),
          )
        : null,
  };
}

export function friendlyGameTimeHeader(input: {
  day: string;
  startTime: string;
  finishTime: string;
  groupName: string | null;
  venueName: string | null;
  courtName: string | null;
  locale: Locale;
}): StepHeaderText {
  const { locale } = input;
  const hero = kickoffHero(
    input.day,
    input.startTime,
    input.finishTime,
    locale,
  );
  const m = messagesFor(locale).mobileCreateGame;
  const place = presentParts([
    input.venueName ?? input.groupName,
    input.courtName,
  ]).join(m.listSeparator);
  const parts = presentParts([
    input.day ? formatDayLabel(input.day, locale) : null,
    place || null,
  ]);
  return {
    title: hero ? [] : [m.header.pickTime],
    ...(hero ? { hero } : {}),
    subtitle: null,
    context: parts.length > 0 ? { parts, stacked: true } : null,
  };
}

function tournamentHero(
  teamCount: number,
  matchTotal: number,
  locale: Locale,
): KickoffHero {
  return {
    value: String(teamCount),
    unit: messagesFor(locale).mobileCreateGame.header.gameTeamsUnit,
    trailing: matchTotal > 0 ? matchCountLabel(matchTotal, locale) : null,
  };
}

function presentParts(parts: readonly (string | null)[]) {
  return parts.filter((part): part is string => Boolean(part));
}

export function tournamentFormatHeader(input: {
  teamCount: number;
  matchTotal: number;
  day: string;
  venueName: string | null;
  courtCount: number;
  locale: Locale;
}): StepHeaderText {
  const { locale } = input;
  return {
    title: [],
    hero: tournamentHero(input.teamCount, input.matchTotal, locale),
    subtitle: null,
    context: {
      parts: presentParts([
        input.day ? formatDayLabel(input.day, locale) : null,
        input.venueName,
        input.courtCount > 0 ? courtCountValue(input.courtCount, locale) : null,
      ]),
    },
  };
}

export function tournamentEntryHeader(input: {
  teamCount: number;
  matchTotal: number;
  day: string;
  startTime: string;
  finishTime: string;
  courtCount: number;
  locale: Locale;
}): StepHeaderText {
  const { locale } = input;
  const window =
    input.startTime && input.finishTime
      ? messagesFor(locale).mobileCreateGame.timeRange(
          formatTimeSlotLabel(input.startTime, locale),
          formatTimeSlotLabel(input.finishTime, locale),
        )
      : null;
  return {
    title: [],
    hero: tournamentHero(input.teamCount, input.matchTotal, locale),
    subtitle: null,
    context: {
      parts: presentParts([
        input.day ? formatDayLabel(input.day, locale) : null,
        window,
        input.courtCount > 0 ? courtCountValue(input.courtCount, locale) : null,
      ]),
    },
  };
}
