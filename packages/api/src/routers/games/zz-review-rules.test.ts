import { eq } from "drizzle-orm";
import { gameTeamPlayers, tournamentDraftMatches } from "@repo/db/schema";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  MatchStatusEnum,
  courts,
  gameTeams,
  games,
  groupMembers,
  groups,
  matches,
  matchResultConfirmations,
  ratingEvents,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { handle as scoreStands } from "#src/jobs/handlers/match.score-stands";
import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { editTeams } from "#src/routers/games/zz-review-head-editTeams";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { kick } from "#src/routers/games/kick";
import { listPoolTables } from "#src/routers/games/poolTables";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { registerSeat } from "#src/routers/games/registerSeat";

const NOW = new Date("2026-09-20T16:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => {
  vi.useRealTimers();
});

async function insertUser(database: TestDatabase, email: string, name?: string) {
  const [row] = await database
    .insert(user)
    .values({ name: name ?? email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  return row!;
}

function identityShuffle<T>(items: readonly T[]): T[] {
  return [...items];
}

async function seed(
  database: TestDatabase,
  prefix: string,
  opts: { post?: boolean; allowSolo?: boolean; teams?: number } = {},
) {
  const owner = await insertUser(database, `${prefix}-owner@example.com`);
  const [venue] = await database
    .insert(venues)
    .values({ name: `Venue ${crypto.randomUUID()}`, city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  const [courtA] = await database
    .insert(courts)
    .values({ venueId: venue!.id, name: "Court 1" })
    .returning({ id: courts.id });
  const [courtB] = await database
    .insert(courts)
    .values({ venueId: venue!.id, name: "Court 2" })
    .returning({ id: courts.id });
  const [group] = await database
    .insert(groups)
    .values({ verifiedAt: new Date(), name: `Group ${prefix}`, createdBy: owner.id })
    .returning({ id: groups.id });
  await database.insert(groupMembers).values({ groupId: group!.id, userId: owner.id });
  const windowStart = new Date("2026-09-20T18:00:00.000Z");
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Autumn Friendly",
    groupId: group!.id,
    isPublic: false,
    registrationMode: "individual",
    allowSoloRegister: opts.allowSolo ?? true,
    teamCount: 4,
    poolCount: 1,
    venueId: venue!.id,
    courtIds: [courtA!.id, courtB!.id],
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
  });
  await database
    .update(games)
    .set({ windowEnd: new Date("2026-10-04T18:45:00.000Z") })
    .where(eq(games.id, created.id));
  const players = [];
  for (let i = 0; i < 8; i += 1) {
    const p = await insertUser(database, `${prefix}-${i}@example.com`, `${prefix}-${i + 1}`);
    await database.insert(groupMembers).values({ groupId: group!.id, userId: p.id });
    players.push(p);
  }
  const teams = opts.teams ?? 4;
  for (let i = 0; i < teams; i += 1) {
    await registerSeat(database, { gameId: created.id, userId: players[i * 2]!.id, sideIndex: i + 1, position: "left" });
    await registerSeat(database, { gameId: created.id, userId: players[i * 2 + 1]!.id, sideIndex: i + 1, position: "right" });
  }
  if (opts.post !== false) {
    await drawPools(database, { gameId: created.id, organizerUserId: owner.id, shuffle: identityShuffle });
    await postPoolDraw(database, { gameId: created.id, organizerUserId: owner.id });
  }
  return { owner, gameId: created.id, players };
}

async function lineup(database: TestDatabase, gameId: string, viewer: string) {
  const game = await gameById(database, { gameId, userId: viewer });
  return game.sides.map((side) => ({
    sideIndex: side.sideIndex,
    gameTeamId: side.gameTeamId,
    left: side.left?.userId ?? null,
    right: side.right?.userId ?? null,
  }));
}

function seatsOf(sides: Awaited<ReturnType<typeof lineup>>) {
  return sides.flatMap((side) => [
    ...(side.left ? [{ userId: side.left, sideIndex: side.sideIndex, position: "left" as const }] : []),
    ...(side.right ? [{ userId: side.right, sideIndex: side.sideIndex, position: "right" as const }] : []),
  ]);
}

async function matchBetween(database: TestDatabase, gameId: string, a: string, b: string) {
  const rows = await database.query.matches.findMany({ where: eq(matches.gameId, gameId) });
  const found = rows.find(
    (row) =>
      (row.slot1GameTeamId === a && row.slot2GameTeamId === b) ||
      (row.slot1GameTeamId === b && row.slot2GameTeamId === a),
  );
  if (!found) throw new Error("no match between teams");
  return found;
}


describe("REVIEW rules on HEAD", () => {
  it("E: posted draw: swap keeps Game team rows, Match slots and Pools; a move to an open spot is refused", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db, "e");
      const before = await lineup(db, s.gameId, s.owner.id);
      const matchesBefore = await db.query.matches.findMany({ where: eq(matches.gameId, s.gameId), columns: { id: true, slot1GameTeamId: true, slot2GameTeamId: true } });
      const teamsBefore = await db.query.gameTeams.findMany({ where: eq(gameTeams.gameId, s.gameId), columns: { id: true, sideIndex: true, poolIndex: true } });
      const a = before[0]!.left!;
      const b = before[1]!.left!;
      const seats = seatsOf(before).map((seat) => seat.userId === a ? { ...seat, sideIndex: 2 } : seat.userId === b ? { ...seat, sideIndex: 1 } : seat);
      const r = await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: true, seats });
      console.log("E swap result", r);
      const after = await lineup(db, s.gameId, s.owner.id);
      const matchesAfter = await db.query.matches.findMany({ where: eq(matches.gameId, s.gameId), columns: { id: true, slot1GameTeamId: true, slot2GameTeamId: true } });
      const teamsAfter = await db.query.gameTeams.findMany({ where: eq(gameTeams.gameId, s.gameId), columns: { id: true, sideIndex: true, poolIndex: true } });
      const sortById = (rows: { id: string }[]) => [...rows].sort((x, y) => x.id.localeCompare(y.id));
      console.log("E: matches unchanged:", JSON.stringify(sortById(matchesBefore)) === JSON.stringify(sortById(matchesAfter)), "teams unchanged:", JSON.stringify(sortById(teamsBefore)) === JSON.stringify(sortById(teamsAfter)), "gameTeamIds kept:", after.map((x) => x.gameTeamId).join() === before.map((x) => x.gameTeamId).join());
      console.log("E: lineup after", after[0]!.left === b, after[1]!.left === a);

      // kick one player of team 4 -> half team after the draw, then try to move someone into the open spot
      await kick(db, { gameId: s.gameId, organizerUserId: s.owner.id, userId: after[3]!.right! });
      const mid = await lineup(db, s.gameId, s.owner.id);
      const mover = mid[2]!.right!;
      const moveSeats = seatsOf(mid).map((seat) => seat.userId === mover ? { ...seat, sideIndex: 4, position: "right" as const } : seat);
      let refused: string | null = null;
      try { await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: false, seats: moveSeats }); } catch (e) { refused = (e as Error).message; }
      console.log("E: move into open spot after posted draw ->", refused ?? "ALLOWED");
      // dropping a player / adding a stranger
      let refused2: string | null = null;
      try { await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: false, seats: [...seatsOf(mid).slice(1), { userId: s.owner.id, sideIndex: 1, position: "left" as const }] }); } catch (e) { refused2 = (e as Error).message; }
      console.log("E: stranger swapped in ->", refused2 ?? "ALLOWED");
      let refused3: string | null = null;
      try { await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: false, seats: seatsOf(mid).map((seat, i) => i === 0 ? { ...seat, sideIndex: 9 } : seat) }); } catch (e) { refused3 = (e as Error).message; }
      console.log("E: side out of range ->", refused3 ?? "ALLOWED");
    } finally { await close(); }
  });

  it("F: partner-required pre-draw: a move leaving a Half team is refused; a swap is allowed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db, "f", { post: false, teams: 3 });
      await db.update(games).set({ allowSoloRegister: false }).where(eq(games.id, s.gameId));
      const before = await lineup(db, s.gameId, s.owner.id);
      const mover = before[0]!.left!;
      let refused: string | null = null;
      try { await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: false, seats: seatsOf(before).map((seat) => seat.userId === mover ? { ...seat, sideIndex: 4 } : seat) }); } catch (e) { refused = (e as Error).message; }
      console.log("F: half-team move on partner-required ->", refused ?? "ALLOWED");
      const a = before[0]!.left!; const b = before[1]!.right!;
      const r = await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: false, seats: seatsOf(before).map((seat) => seat.userId === a ? { ...seat, sideIndex: 2, position: "right" as const } : seat.userId === b ? { ...seat, sideIndex: 1, position: "left" as const } : seat) });
      console.log("F: swap ->", r);
    } finally { await close(); }
  });

  it("G: pre-draw solo-allowed: emptying a team removes it; moved links lose Either side and record the Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db, "g", { post: false, teams: 3 });
      const before = await lineup(db, s.gameId, s.owner.id);
      // move team 3's two players apart: left -> side 4 left (new team), right stays => two Half teams
      const mover = before[2]!.left!;
      await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: false, seats: seatsOf(before).map((seat) => seat.userId === mover ? { ...seat, sideIndex: 4 } : seat) });
      const mid = await lineup(db, s.gameId, s.owner.id);
      console.log("G: after split", JSON.stringify(mid.map((x) => [x.sideIndex, !!x.gameTeamId, !!x.left, !!x.right])));
      // now move the lone player on side 3 onto side 4 => side 3 emptied
      const lone = mid[2]!.right!;
      await editTeams(db, { gameId: s.gameId, organizerUserId: s.owner.id, notifyPlayers: false, seats: seatsOf(mid).map((seat) => seat.userId === lone ? { ...seat, sideIndex: 4, position: "right" as const } : seat) });
      const after = await lineup(db, s.gameId, s.owner.id);
      console.log("G: after merge", JSON.stringify(after.map((x) => [x.sideIndex, !!x.gameTeamId, !!x.left, !!x.right])));
      const links = await db.query.gameTeamPlayers.findMany({ columns: { eitherSide: true, sideSetBy: true, position: true }, with: { gamePlayer: { columns: { userId: true } } } });
      const moved = links.filter((l) => l.gamePlayer.userId === lone || l.gamePlayer.userId === mover);
      console.log("G: moved links", JSON.stringify(moved.map((l) => [l.position, l.eitherSide, l.sideSetBy === s.owner.id])));
      const drafts = await db.query.tournamentDraftMatches.findMany();
      console.log("G: drafts", drafts.length);
    } finally { await close(); }
  });
});
