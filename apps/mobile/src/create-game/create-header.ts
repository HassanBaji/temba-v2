import {
  CREATE_GAME_TYPE_CARDS,
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
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
} from "@repo/domain/tournament-sizing";

import type { CreateState } from "./create-model";

export type HeaderContextIcon = "users" | "trophy";

export type KickoffHero = {
  value: string;
  unit: string;
  trailing: string | null;
};

export type StepHeaderText = {
  title: readonly string[];
  hero?: KickoffHero;
  subtitle: string | null;
  context: { icon?: HeaderContextIcon; parts: readonly string[] } | null;
};

export const CREATE_ENTRY_HEADER: StepHeaderText = {
  title: ["New", "Game"],
  subtitle: null,
  context: null,
};

export type StepHeaderContext = {
  groupName: string | null;
  venues: { locked: boolean; count: number } | null;
};

const TOURNAMENT_RATING =
  CREATE_GAME_TYPE_CARDS.find((card) => card.id === "friendly_tournament")
    ?.rating ?? "";

function venueCountPart(venues: { locked: boolean; count: number }) {
  if (venues.locked) {
    return "Linked Venue";
  }
  return venues.count === 1 ? "1 Venue" : `${venues.count} Venues`;
}

export function stepHeader(
  state: Pick<CreateState, "type" | "step">,
  context: StepHeaderContext,
): StepHeaderText | null {
  if (state.step === 1) {
    return {
      title: ["What are you", "setting up?"],
      subtitle:
        "Both start with a Venue and a time. The rest of the form follows your pick.",
      context: null,
    };
  }
  if (state.step !== 2) {
    return null;
  }
  if (state.type === "friendly_tournament") {
    return {
      title: ["Friendly", "tournament"],
      subtitle: null,
      context: {
        icon: "trophy",
        parts: [
          TOURNAMENT_RATING,
          `${TOURNAMENT_TEAM_MIN} to ${TOURNAMENT_TEAM_MAX} Game teams`,
        ],
      },
    };
  }
  if (!context.groupName) {
    return {
      title: ["Friendly", "game"],
      subtitle: "Start with the Group. Venue rules depend on it.",
      context: null,
    };
  }
  return {
    title: ["Friendly", "game"],
    subtitle: null,
    context: {
      icon: "users",
      parts: context.venues
        ? [context.groupName, venueCountPart(context.venues)]
        : [context.groupName],
    },
  };
}

export function nextStepTitle(
  type: CreateGameTypeId | null,
  step: CreateFlowStep,
): string | null {
  return (
    createFlowLaterSteps(type).find((item) => item.step === step + 1)?.title ??
    null
  );
}

export function kickoffHero(
  day: string,
  startTime: string,
  finishTime: string,
): KickoffHero | null {
  const startsAt = startTime ? parseGameDateTime(day, startTime) : undefined;
  if (!startsAt) {
    return null;
  }
  const { time, meridiem } = formatHomeKickoff(startsAt);
  const endsAt = finishTime ? parseGameDateTime(day, finishTime) : undefined;
  return {
    value: time,
    unit: meridiem,
    trailing:
      endsAt && endsAt.getTime() > startsAt.getTime()
        ? `to ${formatTimeSlotLabel(finishTime)}`
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
}): StepHeaderText {
  const hero = kickoffHero(input.day, input.startTime, input.finishTime);
  const parts = [
    input.day ? formatDayLabel(input.day) : null,
    input.venueName ?? input.groupName,
    input.courtName,
  ].filter((part): part is string => Boolean(part));
  return {
    title: hero ? [] : ["Pick a time"],
    ...(hero ? { hero } : {}),
    subtitle: null,
    context: parts.length > 0 ? { parts } : null,
  };
}
