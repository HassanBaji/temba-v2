import {
  friendlyGameCanMintInvite,
  friendlyGameCtaFamily,
  friendlyGameFooterCanLeaveGame,
  friendlyGameOverflowItems,
  vacantJoinSeats,
  type FriendlyGameCtaFamily,
  type FriendlyGameCtaPhase,
  type FriendlyGameOverflowItem,
} from "./friendly-game-cta";
import { viewerSidePartnerName } from "./friendly-game-partner";
import type { LevelBand } from "./level-bands";

export type FriendlyGameDetailsSeat = {
  userId: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
};

export type FriendlyGameDetailsSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: FriendlyGameDetailsSeat | null;
  right: FriendlyGameDetailsSeat | null;
};

export type FriendlyGameDetailsSet = {
  id: string;
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type FriendlyGameDetailsMatch = {
  id: string;
  startTime: Date | null;
  durationInMinutes: number | null;
  courtName: string | null;
  status: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  canScoreSets: boolean;
  outcome: {
    slot1SetWins: number;
    slot2SetWins: number;
    result: "slot1" | "slot2" | "draw" | "none";
  };
  sets: FriendlyGameDetailsSet[];
};

export type FriendlyGameDetailsConfirmation = {
  confirmedUserIds: string[];
  requiredUserIds: string[];
  viewerHasConfirmed: boolean;
  confirmedAt: Date | null;
};

export type FriendlyGameDetailsRatingImpact = {
  levelChange: number;
  newLevel: number;
  newLevelBand: LevelBand;
  isProvisional: boolean;
  ratedMatchesRemainingToConfirm: number | null;
};

export type FriendlyGameDetailsLevelRangeRequest = {
  status: string;
};

export type FriendlyGameDetails = {
  id: string;
  name: string | null;
  format: string;
  registrationMode: string;
  sport: string | null;
  groupId: string | null;
  groupName: string | null;
  venue: {
    name: string;
    city: string | null;
  } | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  pricePerPlayerFils: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  playersAllowed: number | null;
  cancelledAt: Date | null;
  registrationClosedAt: Date | null;
  isOrganizer: boolean;
  viewerUserId: string;
  joinFrozen: boolean;
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  waitlistPlace: number | null;
  registrationStatus: string;
  canRegister: boolean;
  canWaitlist: boolean;
  canMove: boolean;
  canLeave: boolean;
  registeredUserCount: number;
  viewerLevelTenths: number | null;
  canRequestLevelRange: boolean;
  levelRangeRequest: FriendlyGameDetailsLevelRangeRequest | null;
  matches: FriendlyGameDetailsMatch[];
  sides: FriendlyGameDetailsSide[];
  phase: FriendlyGameCtaPhase | null;
  matchResultConfirmation: FriendlyGameDetailsConfirmation | null;
  ratingImpact: FriendlyGameDetailsRatingImpact | null;
  canReportWrongScore: { eligible: boolean; reason?: string } | null;
};

export type FriendlyGameDetailsPlan<
  Match extends FriendlyGameDetailsMatch = FriendlyGameDetailsMatch,
> = {
  firstMatch: Match | undefined;
  canScoreSets: boolean;
  viewerGameTeamId: string | null;
  partnerBesideName: string | null;
  winningGameTeamId: string | null;
  canMintInvite: boolean;
  ctaFamily: FriendlyGameCtaFamily;
  overflowItems: FriendlyGameOverflowItem[];
  canLeaveGame: boolean;
};

export function friendlyGameDetailsPlan<Game extends FriendlyGameDetails>(
  game: Game,
): FriendlyGameDetailsPlan<Game["matches"][number]> {
  const firstMatch = game.matches[0];
  const canScoreSets = game.matches.some((match) => match.canScoreSets);
  const viewerGameTeamId =
    game.sides.find(
      (side) =>
        side.left?.userId === game.viewerUserId ||
        side.right?.userId === game.viewerUserId,
    )?.gameTeamId ?? null;
  const winningGameTeamId =
    game.phase === "final" && firstMatch
      ? firstMatch.outcome.result === "slot1"
        ? firstMatch.slot1GameTeamId
        : firstMatch.outcome.result === "slot2"
          ? firstMatch.slot2GameTeamId
          : null
      : null;
  const canMintInvite = friendlyGameCanMintInvite(game);

  return {
    firstMatch,
    canScoreSets,
    viewerGameTeamId,
    partnerBesideName: viewerSidePartnerName({
      viewerUserId: game.viewerUserId,
      sides: game.sides,
    }),
    winningGameTeamId,
    canMintInvite,
    ctaFamily: friendlyGameCtaFamily({
      cancelled: Boolean(game.cancelledAt),
      phase: game.phase,
      canScoreSets,
      canWaitlist: game.canWaitlist,
      isWaitlisted: game.isWaitlisted,
      waitlistPlace: game.waitlistPlace,
      canRegister: game.canRegister,
      isSeated: game.isSeated,
      isRegistered: game.isRegistered,
      canMintInvite,
      vacantSeatCount: vacantJoinSeats(game.sides).length,
      ratingImpact: game.ratingImpact,
    }),
    overflowItems: friendlyGameOverflowItems({
      isOrganizer: game.isOrganizer,
      cancelled: Boolean(game.cancelledAt),
      registrationClosed: Boolean(game.registrationClosedAt),
      canMintInvite,
      isWaitlisted: game.isWaitlisted,
    }),
    canLeaveGame: friendlyGameFooterCanLeaveGame({
      isSeated: game.isSeated,
      isRegistered: game.isRegistered,
      canLeave: game.canLeave,
      isWaitlisted: game.isWaitlisted,
    }),
  };
}
