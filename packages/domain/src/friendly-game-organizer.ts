import { friendlyGameOverflowItems } from "./friendly-game-cta";
import type {
  FriendlyGameDetails,
  FriendlyGameDetailsMatch,
} from "./friendly-game-details";
import { friendlyGameCanKickPlayer } from "./friendly-game-players";
import {
  levelRangeQueueVisible,
  levelRangeRequestRowMeta,
} from "./level-range-request";

type Person = { id: string; name: string; image: string | null };

export type FriendlyGameOrganizerInput = Omit<
  FriendlyGameDetails,
  "matches"
> & {
  registeredPlayers: Person[];
  matches: (FriendlyGameDetailsMatch & {
    courtId: string | null;
    canComplete: boolean;
  })[];
  waitlist: (Person & { userId: string | null; teamId: string | null })[];
  unseatedPlayers: Person[];
  pendingLevelRangeRequests: {
    id: string;
    levelTenths: number | null;
    provisional: boolean;
    createdAt: Date;
    user: { id: string; name: string | null; image: string | null };
  }[];
};

export type FriendlyGameOrganizerPlan = {
  registration: "close" | "reopen";
  court: { matchId: string; courtName: string | null } | null;
  completeMatchId: string | null;
  levelRequests: {
    id: string;
    name: string;
    image: string | null;
    meta: string;
  }[];
  showLevelRequests: boolean;
  waitlist: Person[];
  unseated: Person[];
  kickableUserIds: string[];
};

export function friendlyGameOrganizerPlan(
  game: FriendlyGameOrganizerInput,
  now?: Date,
): FriendlyGameOrganizerPlan | null {
  if (!game.isOrganizer || game.cancelledAt) {
    return null;
  }
  const kickable = (userId: string) =>
    friendlyGameCanKickPlayer({
      isOrganizer: true,
      cancelled: false,
      isViewer: userId === game.viewerUserId,
    });
  const items = friendlyGameOverflowItems({
    isOrganizer: true,
    cancelled: false,
    registrationClosed: Boolean(game.registrationClosedAt),
    canMintInvite: false,
    isWaitlisted: false,
  });
  const match = game.matches.find((row) => row.status !== "cancelled");
  const seatedUserIds = game.sides.flatMap((side) =>
    [side.left?.userId, side.right?.userId].filter((userId): userId is string =>
      Boolean(userId),
    ),
  );

  return {
    registration: items.includes("reopen_registration") ? "reopen" : "close",
    court: match ? { matchId: match.id, courtName: match.courtName } : null,
    completeMatchId: game.matches.find((row) => row.canComplete)?.id ?? null,
    showLevelRequests: levelRangeQueueVisible(game),
    levelRequests: game.pendingLevelRangeRequests.map((request) => ({
      id: request.id,
      name: request.user.name ?? "User",
      image: request.user.image,
      meta: levelRangeRequestRowMeta(request, now),
    })),
    waitlist: game.waitlist.map(({ id, name, image }) => ({ id, name, image })),
    unseated: game.unseatedPlayers.filter((player) => kickable(player.id)),
    kickableUserIds: seatedUserIds.filter(kickable),
  };
}
