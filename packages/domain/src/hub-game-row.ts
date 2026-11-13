import type { GameAlbumSummary } from "./game-album";
import type { GameRatingScope } from "./game-rating-scope";
import type { MarkKind } from "./marks";

export type HubGameOccupant = {
  userId: string;
  name: string;
  image: string | null;
  isViewer: boolean;
  /** Joined without picking a Position. */
  eitherSide?: boolean;
};

export type HubGameSide = {
  sideIndex: number;
  left: HubGameOccupant | null;
  right: HubGameOccupant | null;
};

export type HubGameTournamentTeam = {
  gameTeamId: string;
  sideIndex: number | null;
  poolIndex: number | null;
  isViewerTeam: boolean;
  left: HubGameOccupant | null;
  right: HubGameOccupant | null;
};

export type MyTournamentPair = {
  left: HubGameOccupant | null;
  right: HubGameOccupant | null;
};

/** One Pool Match of the viewer's Game team, in Round order. */
export type MyTournamentRound = {
  matchId: string;
  roundNumber: number | null;
  startTime: Date | null;
  courtName: string | null;
  completed: boolean;
  cancelled: boolean;
  outcome: "won" | "lost" | "draw" | null;
  viewerSets: { viewer: number; opponent: number }[];
  opponent: MyTournamentPair;
};

/**
 * The viewer's side of a posted Groups only tournament, so the Games list
 * can show the whole tournament as one card (ADR-0074).
 */
export type MyTournament = {
  viewerTeam: MyTournamentPair;
  poolLabel: string;
  poolSize: number;
  poolCount: number;
  /** Null until the viewer's Game team has played. */
  viewerPosition: number | null;
  /** Every Match of the viewer's Pool is settled, so the place is final. */
  poolFinished: boolean;
  /** The Pool winner, once the Pool is finished. */
  winner: MyTournamentPair | null;
  rounds: MyTournamentRound[];
};

export type HubGameFootballSide = {
  sideIndex: 1 | 2;
  bib: string;
  members: HubGameOccupant[];
};

/** A football Game's teams and Score on a list card; null on other Games. */
export type HubGameFootball = {
  sideSize: number | null;
  sides: HubGameFootballSide[] | null;
  /** Who is in so far: keepers by role, outfield players by Position. */
  positions?: { keepers: number; def: number; mid: number; fwd: number };
  viewer: {
    sideIndex: 1 | 2 | null;
    role: "outfield" | "keeper" | null;
    position: "def" | "mid" | "fwd" | null;
  };
  score: { slot1: number; slot2: number } | null;
  matchId: string | null;
  matchStatus: string | null;
  needsViewerConfirmation: boolean;
  enteredByName: string | null;
};

export type HubGameRow = {
  id: string;
  name: string | null;
  /** False when `name` is the window label the Game was created with. */
  hasCustomName?: boolean;
  format: string;
  registrationMode: string;
  sport: string | null;
  isPublic: boolean;
  rated: boolean;
  ratingScope: GameRatingScope;
  groupId: string | null;
  groupName: string | null;
  startTime: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { id: string; name: string; city: string } | null;
  pricePerPlayerFils: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  registeredUserCount: number;
  playersAllowed: number | null;
  registeredTeamCount: number;
  teamsAllowed: number | null;
  registrationStatus: "open" | "full" | "closed" | "cancelled";
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  canRegister: boolean;
  canWaitlist: boolean;
  sides: HubGameSide[];
  poolCount: number | null;
  tournamentShape: string | null;
  tournament: {
    roundCount: number | null;
    drawPosted: boolean;
    allowSoloRegister: boolean;
    teams: HubGameTournamentTeam[];
    joinSides: HubGameSide[];
    knockout: {
      roundCount: number | null;
      currentRoundName: string | null;
      champion: string | null;
    } | null;
  } | null;
  matchId: string | null;
  roundNumber: number | null;
  roundCount: number | null;
  courtName: string | null;
  poolMatch: {
    poolLabel: string;
    poolSize: number;
    viewerPosition: number | null;
    lastResult: {
      roundNumber: number;
      outcome: "won" | "lost" | "draw" | "cancelled";
      viewerSets: { viewer: number; opponent: number }[];
    } | null;
  } | null;
  knockoutMatch: { round: number; roundCount: number } | null;
  /** Set on a posted Groups only tournament the viewer plays in. */
  myTournament?: MyTournament | null;
  football?: HubGameFootball | null;
  /** A Challenge Game: both sides are set by the Challenge and nobody joins. */
  challenge?: boolean;
};

export type HubHistoryMember = {
  id: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type HubHistoryRow = {
  id: string;
  name: string | null;
  hasCustomName: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
  format: string;
  sport: string | null;
  venue: { name: string };
  displayTime: Date;
  matchId: string;
  groupName: string | null;
  slot1Members: HubHistoryMember[];
  slot2Members: HubHistoryMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2;
  outcome: "won" | "lost" | "draw";
  rated: boolean;
  viewerMarks: MarkKind[];
  viewerIsMvp: boolean;
  /** What the Match moved the viewer's Temba Level, when it counted. */
  levelMove?: { muBefore: number; muAfter: number } | null;
  /** Set when the history groups a Groups only tournament into one row. */
  myTournament?: MyTournament | null;
  album?: GameAlbumSummary;
};
