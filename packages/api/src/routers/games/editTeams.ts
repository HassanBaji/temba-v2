import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { gameTeamPlayers, gameTeams, matches } from "@repo/db";

import { isRosterRegistrationGame } from "@repo/domain/game-shape";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  type GameRow,
  lockGameForAdmit,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { isPoolDrawPosted } from "#src/games/assert-pool-draw-not-posted";
import { clearMatchSlotsForGameTeam } from "#src/games/clear-match-slots-for-game-team";
import {
  setFriendlyMatchSlotForSide,
  sideCount,
  sitsOnCompletedMatch,
} from "#src/games/seats";
import type { SeatPosition } from "#src/games/utils";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Seat = { userId: string; sideIndex: number; position: SeatPosition };

type CurrentSeat = Seat & { linkId: string; gameTeamId: string };

function refuse(code: TRPCError["code"], message: string): never {
  throw new TRPCError({ code, message });
}

function assertEditableFormat(game: GameRow, locale: Locale) {
  const padelGame =
    game.format === "friendly_game" && game.sport !== "football";
  if (
    !(padelGame || game.format === "friendly_tournament") ||
    game.registrationMode !== "individual" ||
    isRosterRegistrationGame(game)
  ) {
    refuse("BAD_REQUEST", messagesFor(locale).editTeams.errors.format);
  }
  if (game.cancelledAt) {
    refuse("FORBIDDEN", messagesFor(locale).game.errors.cancelled);
  }
}

async function assertNoScoreYet(tx: Tx, game: GameRow, locale: Locale) {
  if (game.format !== "friendly_game") {
    return;
  }
  const rows = await tx.query.matches.findMany({
    where: eq(matches.gameId, game.id),
    columns: { status: true },
    with: { sets: { columns: { slot1GamesWon: true, slot2GamesWon: true } } },
  });
  const scored = rows.some(
    (match) =>
      match.status === "completed" ||
      match.sets.some(
        (set) => set.slot1GamesWon != null || set.slot2GamesWon != null,
      ),
  );
  if (scored) {
    refuse("FORBIDDEN", messagesFor(locale).editTeams.errors.scoreIn);
  }
}

async function currentSeats(tx: Tx, gameId: string) {
  const teams = await tx.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true, sideIndex: true },
    with: {
      players: {
        columns: { id: true, position: true },
        with: { gamePlayer: { columns: { userId: true } } },
      },
    },
  });
  const seats: CurrentSeat[] = [];
  for (const team of teams) {
    if (team.sideIndex == null) {
      continue;
    }
    for (const link of team.players) {
      const userId = link.gamePlayer.userId;
      if (userId && (link.position === "left" || link.position === "right")) {
        seats.push({
          userId,
          sideIndex: team.sideIndex,
          position: link.position,
          linkId: link.id,
          gameTeamId: team.id,
        });
      }
    }
  }
  const teamIdBySide = new Map<number, string>();
  for (const team of teams) {
    if (team.sideIndex != null) {
      teamIdBySide.set(team.sideIndex, team.id);
    }
  }
  return { seats, teamIdBySide };
}

function assertSameLineup(
  game: GameRow,
  current: readonly CurrentSeat[],
  next: readonly Seat[],
  locale: Locale,
) {
  const m = messagesFor(locale);
  const n = sideCount(game);
  const spots = new Set<string>();
  for (const seat of next) {
    if (seat.sideIndex < 1 || seat.sideIndex > n) {
      refuse("BAD_REQUEST", m.game.errors.sideNotOnGame);
    }
    const spot = `${seat.sideIndex}:${seat.position}`;
    if (spots.has(spot)) {
      refuse("BAD_REQUEST", m.editTeams.errors.spotTwice);
    }
    spots.add(spot);
  }
  const nextIds = new Set(next.map((seat) => seat.userId));
  const sameIds =
    nextIds.size === next.length &&
    nextIds.size === current.length &&
    current.every((seat) => nextIds.has(seat.userId));
  if (!sameIds) {
    refuse("CONFLICT", m.editTeams.errors.lineupChanged);
  }
}

function membersBySide(seats: readonly Seat[]) {
  const sides = new Map<number, Set<string>>();
  for (const seat of seats) {
    const members = sides.get(seat.sideIndex) ?? new Set<string>();
    members.add(seat.userId);
    sides.set(seat.sideIndex, members);
  }
  return sides;
}

function sameMembers(a: Set<string> | undefined, b: Set<string> | undefined) {
  const left = a ?? new Set<string>();
  const right = b ?? new Set<string>();
  return left.size === right.size && [...left].every((id) => right.has(id));
}

/**
 * A Game team that played a completed Match keeps its two players: the
 * result is theirs. After a posted draw no side gains or loses a player, and
 * a partner-required tournament never ends with a Half team.
 */
async function assertAllowedChanges(
  tx: Tx,
  game: GameRow,
  current: readonly CurrentSeat[],
  next: readonly Seat[],
  teamIdBySide: Map<number, string>,
  locale: Locale,
) {
  const refused = messagesFor(locale).editTeams.refused;
  const before = membersBySide(current);
  const after = membersBySide(next);
  const sideIndexes = new Set([...before.keys(), ...after.keys()]);
  for (const sideIndex of sideIndexes) {
    const was = before.get(sideIndex);
    const now = after.get(sideIndex);
    if (sameMembers(was, now)) {
      continue;
    }
    const gameTeamId = teamIdBySide.get(sideIndex);
    if (gameTeamId && (await sitsOnCompletedMatch(tx, game.id, gameTeamId))) {
      refuse("FORBIDDEN", refused.locked);
    }
    if (isPoolDrawPosted(game) && (was?.size ?? 0) !== (now?.size ?? 0)) {
      refuse("FORBIDDEN", refused.fixedSides);
    }
    if (isPartnerRequiredGame(game) && now?.size === 1) {
      refuse("BAD_REQUEST", refused.halfSide);
    }
  }
}

async function ensureGameTeam(
  tx: Tx,
  game: GameRow,
  sideIndex: number,
  teamIdBySide: Map<number, string>,
) {
  const existing = teamIdBySide.get(sideIndex);
  if (existing) {
    return existing;
  }
  const [created] = await tx
    .insert(gameTeams)
    .values({ gameId: game.id, sideIndex })
    .returning({ id: gameTeams.id });
  if (!created) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  if (game.format === "friendly_game") {
    await setFriendlyMatchSlotForSide(tx, game.id, sideIndex, created.id);
  }
  teamIdBySide.set(sideIndex, created.id);
  return created.id;
}

/**
 * The Organizer rewrites who plays where on a padel Friendly game (until a
 * score goes in) or a Friendly tournament. `seats` is the whole line-up: the
 * same players, each in one spot. Game teams keep their rows, so a
 * tournament's Matches and draw follow the slot and only the names change.
 */
export async function editTeams(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    seats: Seat[];
    notifyPlayers: boolean;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const found = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(found, locale);
  assertEditableFormat(found, locale);
  await assertGameOrganizer(database, found, args.organizerUserId, locale);

  return database.transaction(async (tx) => {
    const game = await lockGameForAdmit(tx, found.id, locale);
    assertEditableFormat(game, locale);
    await assertNoScoreYet(tx, game, locale);
    const { seats: current, teamIdBySide } = await currentSeats(tx, game.id);
    assertSameLineup(game, current, args.seats, locale);
    await assertAllowedChanges(
      tx,
      game,
      current,
      args.seats,
      teamIdBySide,
      locale,
    );

    const byUser = new Map(current.map((seat) => [seat.userId, seat]));
    const changed = args.seats.flatMap((seat) => {
      const was = byUser.get(seat.userId);
      return was &&
        (was.sideIndex !== seat.sideIndex || was.position !== seat.position)
        ? [{ was, seat }]
        : [];
    });
    if (changed.length === 0) {
      return { ok: true as const, moved: 0 };
    }

    const now = new Date();
    await tx
      .update(gameTeamPlayers)
      .set({ position: null, updatedAt: now })
      .where(
        inArray(
          gameTeamPlayers.id,
          changed.map(({ was }) => was.linkId),
        ),
      );
    for (const { was, seat } of changed) {
      const gameTeamId = await ensureGameTeam(
        tx,
        game,
        seat.sideIndex,
        teamIdBySide,
      );
      await tx
        .update(gameTeamPlayers)
        .set({
          gameTeamId,
          position: seat.position,
          eitherSide: false,
          sideSetBy: args.organizerUserId,
          updatedAt: now,
        })
        .where(eq(gameTeamPlayers.id, was.linkId));
    }

    const occupiedSides = new Set(args.seats.map((seat) => seat.sideIndex));
    for (const [sideIndex, gameTeamId] of teamIdBySide) {
      if (occupiedSides.has(sideIndex)) {
        continue;
      }
      await clearMatchSlotsForGameTeam(tx, gameTeamId);
      await tx.delete(gameTeams).where(eq(gameTeams.id, gameTeamId));
    }

    if (args.notifyPlayers) {
      await notify(tx, {
        type: "game_team_changed",
        recipients: changed.map(({ seat }) => ({
          userId: seat.userId,
          audience: "player" as const,
        })),
        excludeUserIds: [args.organizerUserId],
        actorUserId: args.organizerUserId,
        groupId: game.groupId,
        gameId: game.id,
      });
    }
    return { ok: true as const, moved: changed.length };
  });
}

const MAX_SEATS = 128;

export const editTeamsProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      seats: z
        .array(
          z.object({
            userId: z.string().uuid(),
            sideIndex: z.number().int().min(1),
            position: z.enum(["left", "right"]),
          }),
        )
        .min(1)
        .max(MAX_SEATS),
      notifyPlayers: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return editTeams(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      seats: input.seats,
      notifyPlayers: input.notifyPlayers,
      locale: ctx.locale,
    });
  });
