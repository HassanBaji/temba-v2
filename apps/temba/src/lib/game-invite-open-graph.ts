import {
  formatAbsoluteDay,
  formatGameTimeWindow,
} from "~/lib/format-game-start";
import { showsFriendlyRoster } from "~/lib/game-summary-cta";
import { formatLevelRangeLabel } from "~/lib/level-range";

export const GENERIC_TEMBA_OPEN_GRAPH = {
  title: "Temba - the future of competitive sports",
  description: "Temba - the future of competitive sport",
} as const;

export type GameInviteOpenGraphInput = {
  venueName: string;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  format: string;
  registrationMode: string;
  occupiedCount: number;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
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
  input: Pick<GameInviteOpenGraphInput, "levelMinTenths" | "levelMaxTenths">,
) {
  const range = formatLevelRangeLabel(
    input.levelMinTenths,
    input.levelMaxTenths,
  );
  return range ? `${description}, ${range}` : description;
}

export function gameInviteOpenGraphMetadata(input: GameInviteOpenGraphInput) {
  const start = input.windowStart ?? input.windowEnd;
  if (!start) {
    return {
      title: input.venueName,
      description: withLevelRange(input.venueName, input),
    };
  }
  const day = formatAbsoluteDay(start);
  const timeWindow = formatGameTimeWindow(
    input.windowStart,
    input.windowEnd,
    start,
  );
  if (showsFriendlyRoster(input.format, input.registrationMode)) {
    return {
      title: input.venueName,
      description: withLevelRange(
        `${day}, ${timeWindow}, ${input.occupiedCount}/4 sitting`,
        input,
      ),
    };
  }
  return {
    title: input.venueName,
    description: withLevelRange(`${day}, ${timeWindow}`, input),
  };
}
