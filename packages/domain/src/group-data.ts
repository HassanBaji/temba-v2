import type { HubGameRow } from "./hub-game-row";
import type { LevelBand } from "./level-bands";
import type { LevelOverrideReason } from "./level-slider";
import type { MatchSlotMember } from "./match-slots";
import type { FormMark } from "./member-form-marks";
import type { ResultMarkVariant } from "./result-mark";

export type GroupMineRowData = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  memberCount: number;
  standingPosition: number | null;
  nextGameStartTime: Date | string | null;
  formMarks: FormMark[];
};

export type GroupPublicRowData = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  sport: string | null;
  communityName: string | null;
  memberCount: number;
  requiresApproval: boolean;
  joinMode: "join" | "request" | "requested";
};

export type GroupLevelOverrideData = {
  setByName: string;
  setByIsViewer: boolean;
  createdAt: Date | string;
  reason: LevelOverrideReason | null;
};

export type GroupSeasonSummaryData = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  closedAt: Date | string | null;
  status: "upcoming" | "active" | "closed";
};

export type GroupStandingRowData = {
  userId: string;
  name: string | null;
  image: string | null;
  /** 1-based among ranked rows; `null` while unranked. */
  position: number | null;
  ranked: boolean;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  diff: number;
  form: ResultMarkVariant[];
  isViewer: boolean;
  unclaimed: boolean;
};

export type GroupStandingData = {
  /** The Season the rows read, `null` for all-time. */
  seasonId: string | null;
  rows: GroupStandingRowData[];
  /** Completed Matches in the lens. */
  gamesCounted: number;
};

export type GroupLeaderboardEntryData = GroupStandingRowData & {
  isOrganizer: boolean;
  isAppointedOrganizer: boolean;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  level: string | null;
  ratedMatchCount: number;
  levelOverride: GroupLevelOverrideData | null;
  formMarks: FormMark[];
  /** The member's latest completed Match in this Group; null before one. */
  lastPlayedAt: Date | string | null;
  joinedAt: Date | string | null;
  unclaimed: boolean;
  phoneMasked: string | null;
};

export type GroupPlayedGameData = {
  id: string;
  displayTime: Date;
  cancelled: boolean;
  slot1Members: MatchSlotMember[];
  slot2Members: MatchSlotMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2 | null;
  outcome: "won" | "lost" | "draw" | null;
};

export type GroupHomeData = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  sport: string | null;
  communityId: string | null;
  createdAt: Date | string | null;
  totalGamesPlayed: number;
  community: { id: string; name: string } | null;
  isCommunityArchived: boolean;
  membership: object | null;
  communityMembership: object | null;
  standing: {
    memberCount: number;
    leaderboard: GroupLeaderboardEntryData[];
    awaitingScoreCount: number;
    /** The lens the leaderboard reads: the default Season, or all-time. */
    seasonId: string | null;
    gamesCounted: number;
  };
  seasons: GroupSeasonSummaryData[];
  canManageSeasons: boolean;
  upcomingGames: HubGameRow[];
  gameHistory: GroupPlayedGameData[];
  joinMode: string;
  canJoinLoosePublic: boolean;
  canJoinClubPublic: boolean;
  isLoose: boolean;
  canManageLookupInvites: boolean;
  canManageInviteLinks: boolean;
  canCreateGame: boolean;
  requiresApproval: boolean;
  verified: boolean;
  venueCommunity: { venueId: string; venueName: string } | null;
  pendingLinkRequestCount: number | null;
  canUnlinkFromVenue: boolean;
  canSetRequiresApproval: boolean;
  canDecideJoinRequests: boolean;
  joinRequestsApprovedToday: number;
  canManageImage: boolean;
  canAddPlayers: boolean;
  canRemovePlayers: boolean;
  canAppointOrganizers: boolean;
  canDelete: boolean;
  viewerCanSetLevel: boolean;
  type: "public" | "private" | null;
  /** The viewer is the Group creator, who owns it. */
  isOwner: boolean;
  canEdit: boolean;
  canTransferOwnership: boolean;
  /** Sport is locked once the Group has a Game. */
  canChangeSport: boolean;
  pendingJoinRequestCount: number;
};

export type GroupJoinRequestSource = "invite_link" | "community" | "group_page";

export type GroupJoinRequestData = {
  id: string;
  createdAt: Date | string;
  user: { id: string; name: string | null; image: string | null };
  isCommunityMember: boolean | null;
  note: string | null;
  source: GroupJoinRequestSource | null;
  invitedBy: { id: string; name: string } | null;
  level: { levelBand: LevelBand; provisional: boolean; level: string } | null;
};
