import { PARTNER_REQUIRED_UNSEAT_PARTNER_CONFIRM_COPY } from "@repo/domain/tournament-join";

type KickRosterSeat = { userId: string; name: string } | null;

export type GameKickRoster = {
  registeredPlayers: readonly { id: string; name: string }[];
  sides: readonly {
    left: KickRosterSeat;
    right: KickRosterSeat;
  }[];
  waitlist: readonly { id: string; name: string }[];
};

export type GameKickRequest = { userId: string } | { waitlistId: string };

export type GameKickTarget =
  | { kind: "player"; userId: string; name: string }
  | { kind: "waitlist"; waitlistId: string; name: string };

export const KICK_FALLBACK_NAME = "this player";
export const KICK_SPOT_CONFIRM_COPY = "Their spot can open for someone else.";
export const KICK_AFTER_DRAW_CONFIRM_COPY =
  "Their team's unplayed Matches are cancelled.";
export const KICK_WAITLIST_CONFIRM_COPY =
  "They lose their place on the Waitlist.";

function playerName(roster: GameKickRoster, userId: string) {
  const registered = roster.registeredPlayers.find(
    (player) => player.id === userId,
  );
  if (registered) {
    return registered.name;
  }
  for (const side of roster.sides) {
    for (const seat of [side.left, side.right]) {
      if (seat?.userId === userId) {
        return seat.name;
      }
    }
  }
  return KICK_FALLBACK_NAME;
}

export function gameKickTarget(
  roster: GameKickRoster,
  request: GameKickRequest,
): GameKickTarget {
  if ("waitlistId" in request) {
    const entry = roster.waitlist.find(
      (candidate) => candidate.id === request.waitlistId,
    );
    return {
      kind: "waitlist",
      waitlistId: request.waitlistId,
      name: entry?.name ?? KICK_FALLBACK_NAME,
    };
  }
  return {
    kind: "player",
    userId: request.userId,
    name: playerName(roster, request.userId),
  };
}

export function gameKickConfirmCopy(
  target: GameKickTarget,
  game: { partnerRequired: boolean; drawPosted: boolean },
) {
  if (target.kind === "waitlist") {
    return {
      title: `Kick ${target.name} from the waitlist?`,
      description: KICK_WAITLIST_CONFIRM_COPY,
    };
  }
  const title = `Kick ${target.name}?`;
  if (game.drawPosted) {
    return { title, description: KICK_AFTER_DRAW_CONFIRM_COPY };
  }
  if (game.partnerRequired) {
    return { title, description: PARTNER_REQUIRED_UNSEAT_PARTNER_CONFIRM_COPY };
  }
  return { title, description: KICK_SPOT_CONFIRM_COPY };
}
