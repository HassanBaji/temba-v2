import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { user } from "./user";
import { groups } from "./groups";
import { groupSeasons } from "./group-seasons";
import { venues } from "./venues";
import { gamePlayers } from "./game-players";
import { gameTeams } from "./game-teams";
import { gameCourts } from "./game-courts";
import { matches } from "./matches";
import { gameWaitlist } from "./game-waitlist";
import { gameMemberInvites } from "./game-member-invites";
import { gameInviteLinks } from "./game-invite-links";
import { gameLevelRangeRequests } from "./game-level-range-requests";
import { gameMvpVotes } from "./marks";
import { challenges } from "./challenges";
import {
  gameFormats,
  gameRegistrationModes,
  gameSports,
  footballTeamsMethods,
  mvpDecidedBys,
  mvpModes,
  tournamentShapes,
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
} from "./game-enums";

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }),
    hasCustomName: boolean("has_custom_name").notNull().default(false),
    format: gameFormats("format")
      .notNull()
      .default(GameFormatEnum.FRIENDLY_GAME),
    registrationMode: gameRegistrationModes("registration_mode")
      .notNull()
      .default(GameRegistrationModeEnum.INDIVIDUAL),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "restrict",
    }),
    seasonId: uuid("season_id").references(() => groupSeasons.id, {
      onDelete: "set null",
    }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    isPublic: boolean("is_public").notNull().default(false),
    rated: boolean("rated").notNull().default(true),
    /** Moves the Group Level (ADR-0053). `rated` alone says whether it moves the Temba Level. */
    groupRated: boolean("group_rated").notNull().default(false),
    windowStart: timestamp("window_start"),
    windowEnd: timestamp("window_end"),
    playersAllowed: integer("players_allowed"),
    teamsAllowed: integer("teams_allowed"),
    poolCount: integer("pool_count"),
    tournamentShape: tournamentShapes("tournament_shape"),
    qualifiersPerPool: integer("qualifiers_per_pool"),
    matchMinutes: integer("match_minutes"),
    roundCount: integer("round_count"),
    drawPostedAt: timestamp("draw_posted_at"),
    /** King of the court: when the Organizer first posted the final order. */
    finalOrderPostedAt: timestamp("final_order_posted_at"),
    allowSoloRegister: boolean("allow_solo_register").notNull().default(true),
    legacyPricePerPlayerCents: integer("price_per_player_cents"),
    pricePerPlayerFils: integer("price_per_player_fils"),
    levelMinTenths: integer("level_min_tenths"),
    levelMaxTenths: integer("level_max_tenths"),
    sport: gameSports("sport").notNull().default(GameSportEnum.PADEL),
    sideSize: integer("side_size"),
    footballTeamsMethod: footballTeamsMethods("football_teams_method"),
    /** How the MVP is decided. A new Friendly game writes `vote`; every other format stays `none`. */
    mvpMode: mvpModes("mvp_mode").notNull().default("none"),
    /** The MVP, or the Organizer's current pick before the question settles. */
    mvpUserId: uuid("mvp_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    mvpDecidedBy: mvpDecidedBys("mvp_decided_by"),
    mvpDecidedAt: timestamp("mvp_decided_at"),
    /** The MVP question is final, with or without an MVP, and its Notification is sent. */
    mvpSettledAt: timestamp("mvp_settled_at"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    cancelledAt: timestamp("cancelled_at"),
    registrationClosedAt: timestamp("registration_closed_at"),
    /** Set on a Challenge Game: the confirmed Challenge it came from. */
    challengeId: uuid("challenge_id").references(
      (): AnyPgColumn => challenges.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    seasonIdx: index("games_season_id_idx").on(table.seasonId),
    groupWindowIdx: index("games_group_id_window_start_idx").on(
      table.groupId,
      table.windowStart,
    ),
    createdByIdx: index("games_created_by_idx").on(table.createdBy),
    venueIdx: index("games_venue_id_idx").on(table.venueId),
    challengeIdx: index("games_challenge_id_idx").on(table.challengeId),
    sideSizeCheck: check(
      "games_side_size_check",
      sql`${table.sideSize} is null or ${table.sideSize} in (5, 6, 7, 8, 9, 11)`,
    ),
    footballSideSizeCheck: check(
      "games_football_side_size_check",
      sql`${table.sport} <> 'football' or ${table.sideSize} is not null`,
    ),
  }),
);

export const gameRelations = relations(games, ({ one, many }) => ({
  createdBy: one(user, { fields: [games.createdBy], references: [user.id] }),
  mvp: one(user, { fields: [games.mvpUserId], references: [user.id] }),
  group: one(groups, { fields: [games.groupId], references: [groups.id] }),
  season: one(groupSeasons, {
    fields: [games.seasonId],
    references: [groupSeasons.id],
  }),
  venue: one(venues, { fields: [games.venueId], references: [venues.id] }),
  gameCourts: many(gameCourts),
  matches: many(matches),
  players: many(gamePlayers),
  teams: many(gameTeams),
  waitlist: many(gameWaitlist),
  memberInvites: many(gameMemberInvites),
  inviteLinks: many(gameInviteLinks),
  levelRangeRequests: many(gameLevelRangeRequests),
  mvpVotes: many(gameMvpVotes),
}));
