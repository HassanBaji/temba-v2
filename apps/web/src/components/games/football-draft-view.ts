import type { BoardPlayer, Side } from "@repo/domain/football-board";
import type { FootballDraftAnswerState } from "@repo/domain/football-draft";

/**
 * The players placed on a Draft line-up's sides, so the team columns read
 * the draft as they read the published teams.
 */
export function withDraftSides<Player extends Pick<BoardPlayer, "userId">>(
  players: readonly Player[],
  sides: { slot1: readonly string[]; slot2: readonly string[] },
): (Player & { sideIndex: Side | null })[] {
  return players.map((player) => ({
    ...player,
    sideIndex: sides.slot1.includes(player.userId)
      ? 1
      : sides.slot2.includes(player.userId)
        ? 2
        : null,
  }));
}

/**
 * How a Captain's answer is drawn, as `ResultMark` reads: Approved solid,
 * Change asked in outline, Waiting hatched for "not yet". A side with nobody
 * to ask has no mark.
 */
export function draftAnswerMark(state: FootballDraftAnswerState) {
  switch (state) {
    case "approved":
      return "won" as const;
    case "change_asked":
      return "lost" as const;
    case "waiting":
      return "hatch" as const;
    case "none":
      return null;
  }
}
