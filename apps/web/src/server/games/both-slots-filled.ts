import { type MatchRow } from "~/server/games/utils";

export function bothSlotsFilled(match: MatchRow) {
  return Boolean(match.slot1GameTeamId && match.slot2GameTeamId);
}
