import { type MatchRow } from "#src/games/utils";

export function bothSlotsFilled(match: MatchRow) {
  return Boolean(match.slot1GameTeamId && match.slot2GameTeamId);
}
