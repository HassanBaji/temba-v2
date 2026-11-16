import { eq, sql } from "drizzle-orm";
import { vi } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groups,
  matches,
  ratings,
  user,
  venues,
} from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";
import {
  initialRatingFromChoice,
  INITIAL_PHI,
  type SelfDeclareChoice,
} from "@repo/domain/level";

import { type db } from "#src/db";
import { applyKingPlaceAwards } from "#src/ratings/apply-king-place-awards";
import { applyLevelOverride } from "#src/ratings/apply-level-override";
import {
  applyRatedMatch,
  type RatedMatchOutcome,
} from "#src/ratings/apply-rated-match";
import { loadPadelLedger } from "#src/ratings/padel-replay";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { selfDeclareRating } from "#src/routers/ratings/selfDeclare";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-06-01T18:00:00");

export function asDb(database: TestDatabase): typeof db {
  return database as unknown as typeof db;
}

export function at(days: number, hours = 0) {
  return new Date(START.getTime() + days * DAY + hours * 60 * 60 * 1000);
}

export async function insertUser(
  database: TestDatabase,
  name: string,
  options: { guest?: boolean } = {},
) {
  const [row] = await database
    .insert(user)
    .values(
      options.guest
        ? { name, addedAt: new Date(), guestAt: new Date() }
        : { name, email: `${name}-${crypto.randomUUID()}@example.com` },
    )
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

export type Rules = "declared-band" | "before-declared-band";

/** How a player declared: through the live door, or as it stored before the Declared band rules (φ 350, no band kept). */
async function declare(
  database: TestDatabase,
  userId: string,
  choice: SelfDeclareChoice,
  rules: Rules,
) {
  if (rules === "declared-band") {
    await selfDeclareRating(asDb(database), userId, "padel", choice);
    return;
  }
  const initial = initialRatingFromChoice(choice, "padel");
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    ...initial,
    phi: INITIAL_PHI,
    selfDeclaredAt: new Date(),
  });
}

export async function world(database: TestDatabase) {
  const organizer = await insertUser(database, "Organizer");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [club] = await database
    .insert(groups)
    .values({
      name: "Club Group",
      createdBy: organizer,
      venueId: venue!.id,
      verifiedAt: new Date(),
    })
    .returning({ id: groups.id });
  const [loose] = await database
    .insert(groups)
    .values({
      name: "Loose Group",
      createdBy: organizer,
      verifiedAt: new Date(),
    })
    .returning({ id: groups.id });
  return {
    organizer,
    venueId: venue!.id,
    clubId: club!.id,
    looseId: loose!.id,
  };
}

export type World = Awaited<ReturnType<typeof world>>;
export type Where = "club" | "loose" | "public" | "groupless";

export async function insertGame(
  database: TestDatabase,
  w: World,
  where: Where,
) {
  const [game] = await database
    .insert(games)
    .values({
      format: "friendly_tournament",
      createdBy: w.organizer,
      venueId: w.venueId,
      groupId:
        where === "club" ? w.clubId : where === "loose" ? w.looseId : null,
      isPublic: where === "public",
      rated: true,
      windowStart: new Date(),
      windowEnd: new Date(),
    })
    .returning();
  return game!;
}

export async function seatTeam(
  database: TestDatabase,
  gameId: string,
  userIds: readonly string[],
  extra: { startCourt?: number; finalPlace?: number } = {},
) {
  const [team] = await database
    .insert(gameTeams)
    .values({ gameId, ...extra })
    .returning({ id: gameTeams.id });
  for (const userId of userIds) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId, userId })
      .returning({ id: gamePlayers.id });
    await database
      .insert(gameTeamPlayers)
      .values({ gameTeamId: team!.id, gamePlayerId: player!.id });
  }
  return team!.id;
}

/** A completed Match rated by the live writer at `when`. */
export async function ratedMatch(
  database: TestDatabase,
  w: World,
  args: {
    where: Where;
    slot1: [string, string];
    slot2: [string, string];
    outcome: RatedMatchOutcome;
    when: Date;
  },
) {
  vi.setSystemTime(args.when);
  const game = await insertGame(database, w, args.where);
  const slot1 = await seatTeam(database, game.id, args.slot1);
  const slot2 = await seatTeam(database, game.id, args.slot2);
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      slot1GameTeamId: slot1,
      slot2GameTeamId: slot2,
      status: "completed",
      completedAt: args.when,
    })
    .returning();
  await applyRatedMatch(asDb(database), game, match!, args.outcome);
  return { game, match: match! };
}

export async function override(
  database: TestDatabase,
  w: World,
  userId: string,
  level: number,
  when: Date,
) {
  vi.setSystemTime(when);
  await applyLevelOverride(asDb(database), {
    sport: "padel",
    setterUserId: w.organizer,
    setByRole: "operator",
    targetUserId: userId,
    groupId: null,
    level,
    reason: "correcting_a_mistake",
  });
}

/**
 * A history covering every input kind of spec 9.2 the live writers can write:
 * Matches at weight 1 and 0.5, the Prove-it rule, an idle gap, Level
 * overrides before, between and after Matches and one that created the
 * Rating, a stored Reliability loss factor, a Guest player, a reversed and
 * re-entered Match, Place awards and a corrected order with a Guest partner.
 */
export async function writeHistory(database: TestDatabase, rules: Rules) {
  vi.setSystemTime(at(-1));
  const w = await world(database);
  const names = ["dina", "dana", "cleo", "carl", "cora", "bert", "una"];
  const [dina, dana, cleo, carl, cora, bert, una] = await Promise.all(
    names.map((name) => insertUser(database, name)),
  );
  const nora = await insertUser(database, "nora");
  const ghost = await insertUser(database, "ghost", { guest: true });
  const choices: [string, SelfDeclareChoice][] = [
    [dina!, "D2"],
    [dana!, "D1"],
    [cleo!, "C3"],
    [carl!, "C2"],
    [cora!, "C1"],
    [bert!, "B2"],
    [una!, "unknown"],
  ];
  for (const [userId, choice] of choices) {
    await declare(database, userId, choice, rules);
  }
  await override(database, w, cora!, 3.6, at(0));

  await ratedMatch(database, w, {
    where: "club",
    slot1: [dina!, cora!],
    slot2: [carl!, una!],
    outcome: "slot1",
    when: at(1),
  });
  await ratedMatch(database, w, {
    where: "loose",
    slot1: [carl!, cleo!],
    slot2: [dana!, bert!],
    outcome: "slot2",
    when: at(2),
  });
  await override(database, w, nora, 2.4, at(3));
  await ratedMatch(database, w, {
    where: "public",
    slot1: [nora, ghost],
    slot2: [carl!, dina!],
    outcome: "slot1",
    when: at(4),
  });
  await override(database, w, dina!, 1.2, at(5));
  const drawn = await ratedMatch(database, w, {
    where: "club",
    slot1: [carl!, una!],
    slot2: [cleo!, dina!],
    outcome: "draw",
    when: at(6),
  });

  await database
    .update(ratings)
    .set({ reliability: 40 })
    .where(eq(ratings.userId, bert!));
  await ratedMatch(database, w, {
    where: "club",
    slot1: [carl!, cleo!],
    slot2: [bert!, dana!],
    outcome: "slot1",
    when: at(45),
  });
  const disputed = await ratedMatch(database, w, {
    where: "groupless",
    slot1: [carl!, cleo!],
    slot2: [bert!, dana!],
    outcome: "slot1",
    when: at(46),
  });
  vi.setSystemTime(at(46, 2));
  await reportWrongScore(asDb(database), {
    gameId: disputed.game.id,
    matchId: disputed.match.id,
    userId: w.organizer,
  });
  vi.setSystemTime(at(47));
  await applyRatedMatch(asDb(database), disputed.game, disputed.match, "slot2");

  const king = await insertGame(database, w, "club");
  const kingTeams = [
    await seatTeam(database, king.id, [carl!, cleo!], {
      startCourt: 1,
      finalPlace: 1,
    }),
    await seatTeam(database, king.id, [bert!, ghost], {
      startCourt: 1,
      finalPlace: 2,
    }),
    await seatTeam(database, king.id, [dina!, una!], {
      startCourt: 2,
      finalPlace: 3,
    }),
    await seatTeam(database, king.id, [dana!, nora], {
      startCourt: 2,
      finalPlace: 4,
    }),
  ];
  const postOrder = async (when: Date) =>
    database.transaction((tx) =>
      applyKingPlaceAwards(
        tx as unknown as Parameters<typeof applyKingPlaceAwards>[0],
        king,
        when,
      ),
    );
  vi.setSystemTime(at(48));
  await postOrder(at(48));
  for (const [index, finalPlace] of [3, 1, 4, 2].entries()) {
    await database
      .update(gameTeams)
      .set({ finalPlace })
      .where(eq(gameTeams.id, kingTeams[index]!));
  }
  vi.setSystemTime(at(48, 1));
  await postOrder(at(48, 1));

  let last = drawn;
  for (const day of [49, 50, 51, 52]) {
    last = await ratedMatch(database, w, {
      where: "club",
      slot1: [dina!, dana!],
      slot2: [carl!, cleo!],
      outcome: day % 2 === 0 ? "slot1" : "slot2",
      when: at(day),
    });
  }
  await override(database, w, carl!, 3.0, at(53));
  return {
    w,
    dina: dina!,
    dana: dana!,
    cleo: cleo!,
    carl: carl!,
    cora: cora!,
    bert: bert!,
    una: una!,
    nora,
    ghost,
    king,
    drawn,
    last,
  };
}

export async function readLedger(database: TestDatabase) {
  return database.transaction((tx) =>
    loadPadelLedger(tx as unknown as Parameters<typeof loadPadelLedger>[0]),
  );
}

export async function tableChecksums(database: TestDatabase) {
  const tables = await database.execute<{ table_name: string }>(sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  const sums: Record<string, string> = {};
  for (const { table_name: table } of tables.rows) {
    const result = await database.execute<{ sum: string | null }>(
      sql.raw(
        `select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) as sum from "${table}" t`,
      ),
    );
    sums[table] = result.rows[0]?.sum ?? "";
  }
  return sums;
}
