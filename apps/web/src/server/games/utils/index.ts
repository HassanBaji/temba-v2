import type { EmbeddedDatabase } from "@repo/db";
import type {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
} from "@repo/db";
// Value import required for `typeof games.$inferSelect` / `typeof matches.$inferSelect` (type-only import fails TS2749).
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { games, matches } from "@repo/db";

import { type db } from "~/server/db";

type AppTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RegistrationStatus = "open" | "full" | "closed" | "cancelled";

export type MatchRow = typeof matches.$inferSelect;

export type HubListSideOccupant = {
  userId: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type HubListSide = {
  sideIndex: number;
  left: HubListSideOccupant | null;
  right: HubListSideOccupant | null;
};

export type HubListTournamentTeam = {
  gameTeamId: string;
  sideIndex: number | null;
  poolIndex: number | null;
  isViewerTeam: boolean;
  left: HubListSideOccupant | null;
  right: HubListSideOccupant | null;
};

export type HubListTournamentKnockout = {
  /** Knockout rounds in the tree: planned before the draw is posted. */
  roundCount: number | null;
  /** The Knockout round now being played, e.g. `Semi-finals`. */
  currentRoundName: string | null;
  /** The Champion's name, once the Final is won or awarded as a Walkover. */
  champion: string | null;
};

export type HubListTournament = {
  /** Pool Rounds, or Knockout rounds on Knockout only: planned before the draw is posted, the posted count after. */
  roundCount: number | null;
  drawPosted: boolean;
  allowSoloRegister: boolean;
  /** Game teams with at least one occupant: the viewer's first, then by side. */
  teams: HubListTournamentTeam[];
  /** Every side 1..teamsAllowed, for the join sheet. */
  joinSides: HubListSide[];
  /** Null on a Groups only tournament. */
  knockout: HubListTournamentKnockout | null;
};

export type HubListPoolMatchOutcome = "won" | "lost" | "draw" | "cancelled";

export type HubListPoolMatch = {
  /** The Pool identifier shown after "group", as the tournament detail labels it. */
  poolLabel: string;
  poolSize: number;
  /** Null until the viewer's Game team has played a Pool Match. */
  viewerPosition: number | null;
  lastResult: {
    roundNumber: number;
    outcome: HubListPoolMatchOutcome;
    viewerSets: { viewer: number; opponent: number }[];
  } | null;
};

export type HubListKnockoutMatch = {
  round: number;
  roundCount: number;
};

export type HubListRow = {
  id: string;
  name: string | null;
  format: GameFormatEnum | string;
  registrationMode: GameRegistrationModeEnum | string;
  sport: GameSportEnum | string | null;
  isPublic: boolean;
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
  registrationStatus: RegistrationStatus;
  joinFrozen: boolean;
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  canRegister: boolean;
  canWaitlist: boolean;
  sides: HubListSide[];
  poolCount: number | null;
  tournamentShape: string | null;
  /** Null unless the Game is a drawn tournament. */
  tournament: HubListTournament | null;
  /** Set when My Games / Home expand a posted Pool or Knockout Match into its own row. */
  matchId: string | null;
  roundNumber: number | null;
  roundCount: number | null;
  courtName: string | null;
  /** Only on expanded Pool Match rows. */
  poolMatch: HubListPoolMatch | null;
  /** Only on expanded Knockout Match rows, which carry no Round number. */
  knockoutMatch: HubListKnockoutMatch | null;
};

export type GameCreateGroupKind = "club" | "loose" | "none";

export type GameCreateVenueContext = {
  locked: boolean;
  groupKind: GameCreateGroupKind;
  linkedVenueId: string | null;
};

export type GameCreateVenueOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  archivedAt: Date | null;
  courts: { id: string; name: string }[];
};

export type CreateFriendlyDb = typeof db | AppTx | EmbeddedDatabase;

export type CreateFriendlyGameInput = {
  createdBy: string;
  name?: string | null;
  groupId: string;
  venueId: string;
  courtId?: string | null;
  windowStart: Date;
  windowEnd: Date;
  /** Null / omitted = unset. 0 = free. Positive = fils per User occupying a seat. */
  pricePerPlayerFils?: number | null;
  /** Null / omitted = that bound unset. 0 = Level 0.0. */
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
};

export type CreateFriendlyGameResult = {
  game: typeof games.$inferSelect;
  matchId: string;
};

export type CreateGameInput = {
  createdBy: string;
  name?: string;
  groupId: string;
  isPublic: boolean;
  format: "friendly_game" | "americano" | "friendly_tournament";
  registrationMode: "individual" | "team_only";
  playersAllowed?: number;
  teamsAllowed?: number;
  windowStart: Date;
  windowEnd: Date;
  venueId: string;
  courtId?: string | null;
  courtIds?: string[];
  pricePerPlayerFils?: number | null;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
};

export type SeatPosition = "left" | "right";

export type SeatOccupant = {
  userId: string;
  name: string;
  image: string | null;
};

export type GameSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: SeatOccupant | null;
  right: SeatOccupant | null;
};

export type VacatedSeat = {
  sideIndex: number;
  position: SeatPosition;
};

export type AdmitDb = typeof db | AppTx | EmbeddedDatabase;

export type AdmitDoor = "register" | "promote";

export type AdmitParty =
  | {
      kind: "user";
      userId: string;
      seat?: { sideIndex: number; position: SeatPosition };
    }
  | {
      kind: "pair";
      userIds: readonly [string, string];
      sideIndex: number;
      callerPosition: SeatPosition;
    }
  | { kind: "team"; teamId: string };

export type AdmitReason =
  | "full"
  | "registration_closed"
  | "join_frozen"
  | "already_on_game"
  | "seat_required"
  | "no_vacant_side"
  | "team_not_found"
  | "team_incomplete"
  | "team_already_on_game"
  | "level_range";

export type AdmitPlacement =
  | {
      kind: "user";
      userId: string;
      sideIndex?: number;
      position?: SeatPosition;
    }
  | {
      kind: "pair";
      userIds: readonly [string, string];
      sideIndex: number;
    }
  | { kind: "team"; teamId: string; sideIndex: number };

export type AdmitResult =
  | { ok: true; placement: AdmitPlacement }
  | { ok: false; reason: AdmitReason };

export type TournamentMatchInput = {
  startTime: Date | null;
  endTime: Date | null;
  durationInMinutes: number | null;
  courtId: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
};

export type MatchUpdateInput = {
  startTime?: Date | null;
  endTime?: Date | null;
  durationInMinutes?: number | null;
  courtId?: string | null;
  slot1GameTeamId?: string | null;
  slot2GameTeamId?: string | null;
};
