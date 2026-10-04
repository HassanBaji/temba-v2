import type { HubGameRow } from "./hub-game-row";
import type { LevelBand } from "./level-bands";
import type { MatchSlotMember } from "./match-slots";
import type { FormMark } from "./member-form-marks";

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
  communityName: string | null;
  memberCount: number;
  requiresApproval: boolean;
  joinMode: "join" | "request" | "requested";
};

export type GroupLeaderboardEntryData = {
  userId: string;
  name: string | null;
  image: string | null;
  totalSetsWon: number;
  totalPointsWon: number;
  totalGamesPlayed: number;
  position: number;
  isViewer: boolean;
  isOrganizer: boolean;
  wins: number;
  losses: number;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  formMarks: FormMark[];
  joinedAt: Date | string | null;
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
  };
  upcomingGames: HubGameRow[];
  gameHistory: GroupPlayedGameData[];
  joinMode: string;
  canJoinLoosePublic: boolean;
  canJoinClubPublic: boolean;
};
