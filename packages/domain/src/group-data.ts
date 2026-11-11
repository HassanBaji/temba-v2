import type { FootballBib } from "./football-lineup";
import type { GroupPlayedCounts } from "./group-played-filter";
import type { HubGameRow } from "./hub-game-row";
import type { LevelBand } from "./level-bands";
import type { LevelOverrideReason } from "./level-slider";
import type { MatchSlotMember } from "./match-slots";
import type { FormMark } from "./member-form-marks";
import type { ResultMarkVariant } from "./result-mark";
import type { TierBand } from "./tier-bands";

export type GroupMineRowData = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  sport: string | null;
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
  venueName: string | null;
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

/** A member's Group Level in this Group (ADR-0053); null before one exists. */
export type GroupMemberGroupLevelData = {
  level: string;
  rating: number;
  levelBand: LevelBand;
  provisional: boolean;
};

/** A member's Group Tier in a tier Group (ADR-0067). */
export type GroupMemberTierData = {
  band: TierBand | null;
  place: number | null;
  /** Null while Provisional, unless the viewer is the member or an Organizer. */
  points: number | null;
  provisional: boolean;
  gamesOfFive: number;
  /** Every tier Game counted, which breaks a tie on points. */
  gamesCounted?: number;
};

export type GroupTierSummaryData = {
  shark: {
    userId: string;
    name: string;
    points: number;
    /** When they last became the Shark; null when no change is recorded. */
    since: Date | string | null;
  } | null;
  rankedCount: number;
  provisionalCount: number;
};

export type GroupLeaderboardEntryData = GroupStandingRowData & {
  isOrganizer: boolean;
  isAppointedOrganizer: boolean;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  level: string | null;
  ratedMatchCount: number;
  levelOverride: GroupLevelOverrideData | null;
  groupLevel?: GroupMemberGroupLevelData | null;
  formMarks: FormMark[];
  /** The member's latest completed Match in this Group; null before one. */
  lastPlayedAt: Date | string | null;
  /** Set on every member of a tier Group, absent elsewhere. */
  tier?: GroupMemberTierData | null;
  joinedAt: Date | string | null;
  unclaimed: boolean;
  phoneMasked: string | null;
  /** The viewer may fix this Unclaimed player's name here. */
  canRename?: boolean;
};

export type GroupPlayedGameData = {
  id: string;
  name: string | null;
  hasCustomName: boolean;
  sport: string | null;
  venueName: string | null;
  courtName: string | null;
  displayTime: Date;
  cancelled: boolean;
  joinedCount: number;
  playersAllowed: number | null;
  slot1Members: MatchSlotMember[];
  slot2Members: MatchSlotMember[];
  slot1Bib: FootballBib | null;
  slot2Bib: FootballBib | null;
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2 | null;
  outcome: "won" | "lost" | "draw" | null;
};

/** A Team tagged to the Group. The Group does not own it. */
export type GroupTeamData = {
  id: string;
  displayName: string | null;
  sport: string;
  rosterCount: number;
  record: { gamesPlayed: number; wins: number; draws: number; losses: number };
};

export type GroupHomeData = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  sport: string | null;
  createdAt: Date | string | null;
  totalGamesPlayed: number;
  membership: object | null;
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
  gameHistoryCounts: GroupPlayedCounts;
  joinMode: string;
  canJoin: boolean;
  /** No Venue link; a Club Group is linked to one Venue. */
  isLoose: boolean;
  canManageLookupInvites: boolean;
  canManageInviteLinks: boolean;
  canCreateGame: boolean;
  requiresApproval: boolean;
  verified: boolean;
  /** A football Group that is not Verified (ADR-0066). */
  hasTier?: boolean;
  tierSummary?: GroupTierSummaryData | null;
  venue: { id: string; name: string } | null;
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
  teams: GroupTeamData[];
  /** An Organizer of a Group with a sport may create a Team tagged to it. */
  canCreateTeam: boolean;
};

export type GroupJoinRequestSource = "invite_link" | "group_page";

export type GroupJoinRequestData = {
  id: string;
  createdAt: Date | string;
  user: { id: string; name: string | null; image: string | null };
  note: string | null;
  source: GroupJoinRequestSource | null;
  invitedBy: { id: string; name: string } | null;
  level: { levelBand: LevelBand; provisional: boolean; level: string } | null;
};
