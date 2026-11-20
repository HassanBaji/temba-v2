import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { games } from "./games";
import { user } from "./user";

export const LIVE_BOARD_COLOR_SCHEME_VALUES = ["dark", "light"] as const;

export const liveBoardColorSchemes = pgEnum(
  "live_board_color_scheme",
  LIVE_BOARD_COLOR_SCHEME_VALUES,
);

export const LIVE_BOARD_SCREEN_VALUES = [
  "on_court",
  "table",
  "next_up",
] as const;

export const liveBoardScreens = pgEnum(
  "live_board_screen",
  LIVE_BOARD_SCREEN_VALUES,
);

export const liveBoards = pgTable(
  "live_boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .references(() => games.id, { onDelete: "cascade" })
      .notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    createdBy: uuid("created_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    rotate: boolean("rotate").notNull().default(true),
    rotateSeconds: integer("rotate_seconds").notNull().default(10),
    // The Board screen held while rotate is off.
    heldScreen: liveBoardScreens("held_screen").notNull().default("on_court"),
    // Every TV works out the screen on show from this one moment.
    rotationStartedAt: timestamp("rotation_started_at").notNull().defaultNow(),
    colorScheme: liveBoardColorSchemes("color_scheme")
      .notNull()
      .default("dark"),
    showQr: boolean("show_qr").notNull().default(true),
    message: varchar("message", { length: 80 }),
    messageShown: boolean("message_shown").notNull().default(false),
    stoppedAt: timestamp("stopped_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Stopping retires a board's code and frees its Game. A board that closed
    // on its own keeps both, so moving its Game's window later opens it again.
    runningCode: uniqueIndex("live_boards_running_code_unique")
      .on(table.code)
      .where(sql`${table.stoppedAt} is null`),
    runningGame: uniqueIndex("live_boards_running_game_unique")
      .on(table.gameId)
      .where(sql`${table.stoppedAt} is null`),
    gameIdx: index("live_boards_game_id_idx").on(table.gameId),
  }),
);

export const liveBoardTvs = pgTable(
  "live_board_tvs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .references(() => liveBoards.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    connectedAt: timestamp("connected_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    disconnectedAt: timestamp("disconnected_at"),
  },
  (table) => ({
    boardIdx: index("live_board_tvs_board_id_idx").on(table.boardId),
  }),
);

export const liveBoardRelations = relations(liveBoards, ({ one, many }) => ({
  game: one(games, {
    fields: [liveBoards.gameId],
    references: [games.id],
  }),
  createdBy: one(user, {
    fields: [liveBoards.createdBy],
    references: [user.id],
  }),
  tvs: many(liveBoardTvs),
}));

export const liveBoardTvRelations = relations(liveBoardTvs, ({ one }) => ({
  board: one(liveBoards, {
    fields: [liveBoardTvs.boardId],
    references: [liveBoards.id],
  }),
}));
