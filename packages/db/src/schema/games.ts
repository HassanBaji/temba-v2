import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./user";
import { groups } from "./groups";
import { gamePlayers } from "./game-players";
import { gameTeams } from "./game-teams";
import { matches } from "./matches";
import { gameWaitlist } from "./game-waitlist";
import { gameMemberInvites } from "./game-member-invites";
import { gameInviteLinks } from "./game-invite-links";
import {
  gameFormats,
  gameRegistrationModes,
  gameSports,
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
} from "./game-enums";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  format: gameFormats("format").notNull().default(GameFormatEnum.FRIENDLY_GAME),
  registrationMode: gameRegistrationModes("registration_mode")
    .notNull()
    .default(GameRegistrationModeEnum.INDIVIDUAL),
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "restrict",
  }),
  isPublic: boolean("is_public").notNull().default(false),
  windowStart: timestamp("window_start"),
  windowEnd: timestamp("window_end"),
  playersAllowed: integer("players_allowed"),
  teamsAllowed: integer("teams_allowed"),
  sport: gameSports("sport").default(GameSportEnum.PADEL),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  cancelledAt: timestamp("cancelled_at"),
  registrationClosedAt: timestamp("registration_closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gameRelations = relations(games, ({ one, many }) => ({
  createdBy: one(user, { fields: [games.createdBy], references: [user.id] }),
  group: one(groups, { fields: [games.groupId], references: [groups.id] }),
  matches: many(matches),
  players: many(gamePlayers),
  teams: many(gameTeams),
  waitlist: many(gameWaitlist),
  memberInvites: many(gameMemberInvites),
  inviteLinks: many(gameInviteLinks),
}));
