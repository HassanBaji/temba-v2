import { eq } from "drizzle-orm";

import {
  GroupMemberRoleEnum,
  courts,
  footballLineupDrafts,
  groupMembers,
  groups,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import { type db } from "#src/db";
import { createGame } from "#src/routers/games/create";
import { footballBoard } from "#src/routers/games/footballBoard";
import { footballPickRoom } from "#src/routers/games/footballPickRoom";
import { openFootballPickRoom } from "#src/routers/games/openFootballPickRoom";
import { pickFootballPlayer } from "#src/routers/games/pickFootballPlayer";
import { register } from "#src/routers/games/register";
import { startFootballPick } from "#src/routers/games/startFootballPick";
import { undoFootballPick } from "#src/routers/games/undoFootballPick";

const HOUR = 60 * 60 * 1000;

type Database = typeof db;

export type Fixture = {
  db: Database;
  organizer: { id: string };
  groupId: string;
  venueId: string;
  gameId: string;
};

export async function insertUser(
  database: Database,
  name: string,
  extra: Partial<typeof user.$inferInsert> = {},
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name}-${crypto.randomUUID()}@example.com`,
      ...extra,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

export async function withFootballGame(run: (f: Fixture) => Promise<void>) {
  const { db: pglite, close } = await createPgliteDb();
  const db = pglite as unknown as Database;
  try {
    const organizer = await insertUser(db, "Hassan Haji");
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Venue ${crypto.randomUUID()}`,
        city: "Manama",
        country: "BH",
      })
      .returning({ id: venues.id });
    const [pitch] = await db
      .insert(courts)
      .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
      .returning({ id: courts.id });
    const [group] = await db
      .insert(groups)
      .values({
        name: "Friday Football",
        createdBy: organizer.id,
        sport: "football",
      })
      .returning({ id: groups.id });
    await db
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: organizer.id });
    const windowStart = new Date(Date.now() + HOUR);
    const created = await createGame(db, {
      createdBy: organizer.id,
      groupId: group!.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: venue!.id,
      courtId: pitch!.id,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + HOUR),
    });
    await run({
      db,
      organizer,
      groupId: group!.id,
      venueId: venue!.id,
      gameId: created.id,
    });
  } finally {
    await close();
  }
}

export async function addMember(
  f: Fixture,
  name: string,
  role: GroupMemberRoleEnum = GroupMemberRoleEnum.MEMBER,
) {
  const member = await insertUser(f.db, name);
  await f.db
    .insert(groupMembers)
    .values({ groupId: f.groupId, userId: member.id, role });
  return member;
}

export async function addPlayers(f: Fixture, count: number) {
  const players: { id: string }[] = [];
  for (let index = 0; index < count; index += 1) {
    const player = await addMember(f, `p${index}`);
    await register(f.db, { gameId: f.gameId, userId: player.id });
    players.push(player);
  }
  return players;
}

export function open(
  f: Fixture,
  captains: { slot1: { id: string }; slot2: { id: string } },
  extra: Partial<Parameters<typeof openFootballPickRoom>[1]> = {},
  now?: Date,
) {
  return openFootballPickRoom(
    f.db,
    {
      gameId: f.gameId,
      userId: f.organizer.id,
      bibs: { slot1: "black", slot2: "white" },
      captains: { slot1: captains.slot1.id, slot2: captains.slot2.id },
      firstPick: "toss",
      ...extra,
    },
    now,
  );
}

export function room(
  f: Fixture,
  viewer: { id: string },
  now?: Date,
  random?: () => number,
) {
  return footballPickRoom(
    f.db,
    { gameId: f.gameId, userId: viewer.id },
    now,
    random,
  );
}

export function boardFor(f: Fixture, userId: string) {
  return footballBoard(f.db, { gameId: f.gameId, userId });
}

export async function draftRow(f: Fixture) {
  const row = await f.db.query.footballLineupDrafts.findFirst({
    where: eq(footballLineupDrafts.gameId, f.gameId),
  });
  if (!row) {
    throw new Error("No draft");
  }
  return row;
}

export async function notificationsOf(f: Fixture, type: string) {
  const rows = await f.db.query.notifications.findMany({
    columns: { type: true, recipientUserId: true, actorUserId: true },
  });
  return rows.filter((row) => row.type === type);
}

export function live<T extends { status: string }>(view: T) {
  if (view.status === "stopped") {
    throw new Error("The room is stopped");
  }
  return view as Exclude<T, { status: "stopped" }>;
}

export async function startLive(
  f: Fixture,
  captains: { slot1: { id: string }; slot2: { id: string } },
  firstPick: "slot1" | "slot2" = "slot1",
) {
  await open(f, captains, { firstPick });
  await startFootballPick(f.db, { gameId: f.gameId, userId: f.organizer.id });
}

export function pick(
  f: Fixture,
  by: { id: string },
  player: { id: string },
  pickNumber: number,
  forSide?: 1 | 2,
) {
  return pickFootballPlayer(f.db, {
    gameId: f.gameId,
    userId: by.id,
    pickedUserId: player.id,
    pickNumber,
    forSide,
  });
}

export function undo(f: Fixture, by: { id: string }, pickNumber: number) {
  return undoFootballPick(f.db, {
    gameId: f.gameId,
    userId: by.id,
    pickNumber,
  });
}
