import { pgEnum } from "drizzle-orm/pg-core";

export const gameStatus = pgEnum("game_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const gameSports = pgEnum("game_sport", ["padel", "football"]);

export const gameFormats = pgEnum("game_format", [
  "friendly_game",
  "americano",
  "friendly_tournament",
]);

export const tournamentShapes = pgEnum("tournament_shape", [
  "groups_only",
  "groups_then_knockout",
  "knockout_only",
]);

export const gameRegistrationModes = pgEnum("game_registration_mode", [
  "individual",
  "team_only",
]);

export const gamePositions = pgEnum("game_position", ["left", "right"]);

export const footballRoles = pgEnum("football_role", ["outfield", "keeper"]);

export const footballPositions = pgEnum("football_position", [
  "def",
  "mid",
  "fwd",
]);

export const footballBibs = pgEnum("football_bib", [
  "black",
  "white",
  "red",
  "navy",
  "sky",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "grey",
]);

export const footballTeamsMethods = pgEnum("football_teams_method", [
  "level",
  "manual",
]);

export const MVP_MODE_VALUES = ["vote", "organizer", "none"] as const;

export const mvpModes = pgEnum("mvp_mode", MVP_MODE_VALUES);

export const MVP_DECIDED_BY_VALUES = [
  "vote",
  "organizer",
  "tie_break",
] as const;

export const mvpDecidedBys = pgEnum("mvp_decided_by", MVP_DECIDED_BY_VALUES);

export enum MatchStatusEnum {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/** @deprecated Match status lives on Match; kept as an alias for leftover imports. */
export const GameStatusEnum = MatchStatusEnum;

export enum GameSportEnum {
  PADEL = "padel",
  Football = "football",
}

export enum GameFormatEnum {
  FRIENDLY_GAME = "friendly_game",
  AMERICANO = "americano",
  FRIENDLY_TOURNAMENT = "friendly_tournament",
}

export enum TournamentShapeEnum {
  GROUPS_ONLY = "groups_only",
  GROUPS_THEN_KNOCKOUT = "groups_then_knockout",
  KNOCKOUT_ONLY = "knockout_only",
}

export enum GameRegistrationModeEnum {
  INDIVIDUAL = "individual",
  TEAM_ONLY = "team_only",
}

export enum GamePositionEnum {
  LEFT = "left",
  RIGHT = "right",
}
