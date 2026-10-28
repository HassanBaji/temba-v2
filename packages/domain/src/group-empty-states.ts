import { DEFAULT_FOOTBALL_SIDE_SIZE } from "./game-shape";
import { sportLabel } from "./sport";

/** The Standing preview draws this many rows before the first result. */
export const GROUP_STANDING_PREVIEW_SEATS = 4;

const PADEL_MATCH_PLAYERS = 4;

export const GROUP_STANDING_AFTER_FIRST_RESULT =
  "Standings appear after the first result.";

export const GROUP_GAMES_EMPTY_COPY =
  "Once a Game is set with a live window or Match, it shows up here.";

/** Players a first Game needs: a padel Match, or the default football side twice. */
export function groupGamePlayersNeeded(sport: string | null | undefined) {
  return sport === "football"
    ? 2 * DEFAULT_FOOTBALL_SIDE_SIZE
    : PADEL_MATCH_PLAYERS;
}

/** Positions of the open-seat rows that pad the Standing preview. */
export function groupStandingOpenSeats(memberCount: number): number[] {
  const open = Math.max(0, GROUP_STANDING_PREVIEW_SEATS - memberCount);
  return Array.from({ length: open }, (_, index) => memberCount + index + 1);
}

export function groupStandingEmptyFooter(memberCount: number) {
  if (memberCount >= GROUP_STANDING_PREVIEW_SEATS) {
    return GROUP_STANDING_AFTER_FIRST_RESULT;
  }
  return `${memberCount} of ${GROUP_STANDING_PREVIEW_SEATS} seats filled. ${GROUP_STANDING_AFTER_FIRST_RESULT}`;
}

export function groupGamesEmptyLine(input: {
  sport: string | null | undefined;
  memberCount: number;
  isMember: boolean;
}) {
  const needed = groupGamePlayersNeeded(input.sport);
  const sport = sportLabel(input.sport) ?? "A Game";
  if (!input.isMember || input.memberCount >= needed) {
    return GROUP_GAMES_EMPTY_COPY;
  }
  return `${sport} needs ${needed}. You have ${input.memberCount}. ${GROUP_GAMES_EMPTY_COPY}`;
}
