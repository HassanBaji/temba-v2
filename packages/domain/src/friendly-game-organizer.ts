import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { organizerCanAddPlayer } from "./add-player-by-phone";
import { friendlyGameOverflowItems } from "./friendly-game-cta";
import type {
  FriendlyGameDetails,
  FriendlyGameDetailsMatch,
} from "./friendly-game-details";
import { friendlyGameCanKickPlayer } from "./friendly-game-players";
import {
  gameOrganizerRequests,
  gameRequestsVisible,
  type OrganizerRequest,
} from "./game-requests";
import type { SeatHoldRequestRow } from "./seat-hold-request";

export type { OrganizerRequest, OrganizerRequestKind } from "./game-requests";

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
  pendingSeatHolds?: SeatHoldRequestRow[];
};

export type FriendlyGameOrganizerPlan = {
  registration: "close" | "reopen";
  court: { matchId: string; courtName: string | null } | null;
  completeMatchId: string | null;
  /** One queue: Seat holds from the Game's link, then Level range requests. */
  requests: OrganizerRequest[];
  showRequests: boolean;
  waitlist: Person[];
  unseated: Person[];
  kickableUserIds: string[];
  canAddPlayer: boolean;
};

export function friendlyGameOrganizerPlan(
  game: FriendlyGameOrganizerInput,
  locale: Locale,
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
    showRequests: gameRequestsVisible(game),
    requests: gameOrganizerRequests(game, locale, now),
    waitlist: game.waitlist.map(({ id, name, image }) => ({ id, name, image })),
    unseated: game.unseatedPlayers.filter((player) => kickable(player.id)),
    kickableUserIds: seatedUserIds.filter(kickable),
    canAddPlayer: organizerCanAddPlayer(game),
  };
}
