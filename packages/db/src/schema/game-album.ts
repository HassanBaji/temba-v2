import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { games } from "./games";
import { user } from "./user";

export const GAME_NOTE_VISIBILITY_VALUES = ["public", "private"] as const;

export const gameNoteVisibilities = pgEnum(
  "game_note_visibility",
  GAME_NOTE_VISIBILITY_VALUES,
);

/**
 * A photo a player added to a played Game's Album. The bytes live in the
 * bucket under `game-photos/<gameId>/<id>`; the row records who added it.
 * The cap of six per Game is enforced by the adding door under the Game lock.
 */
export const gamePhotos = pgTable(
  "game_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    uploaderUserId: uuid("uploader_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    gameCreatedIdx: index("game_photos_game_id_created_at_idx").on(
      table.gameId,
      table.createdAt,
    ),
    uploaderIdx: index("game_photos_uploader_user_id_idx").on(
      table.uploaderUserId,
    ),
  }),
);

/**
 * A player's Game note: one per player per Game. Public is read by the
 * players of that Game; private is read by its author alone.
 */
export const gameNotes = pgTable(
  "game_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: varchar("body", { length: 300 }).notNull(),
    visibility: gameNoteVisibilities("visibility").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    onePerPlayer: unique("game_notes_game_author_unique").on(
      table.gameId,
      table.authorUserId,
    ),
    bodyNotBlank: check(
      "game_notes_body_not_blank_check",
      sql`length(btrim(${table.body})) > 0`,
    ),
    authorCreatedIdx: index("game_notes_author_user_id_created_at_idx").on(
      table.authorUserId,
      table.createdAt,
    ),
  }),
);

export const gamePhotoRelations = relations(gamePhotos, ({ one }) => ({
  game: one(games, { fields: [gamePhotos.gameId], references: [games.id] }),
  uploader: one(user, {
    fields: [gamePhotos.uploaderUserId],
    references: [user.id],
  }),
}));

export const gameNoteRelations = relations(gameNotes, ({ one }) => ({
  game: one(games, { fields: [gameNotes.gameId], references: [games.id] }),
  author: one(user, {
    fields: [gameNotes.authorUserId],
    references: [user.id],
  }),
}));
