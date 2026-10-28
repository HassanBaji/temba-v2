import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, gameTeams } from "@repo/db";

import { ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL } from "@repo/domain/add-player-by-phone";
import {
  FOOTBALL_SELF_PLACEMENTS,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import type {
  FootballPosition,
  FootballRole,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import type { PadelLevelChoice } from "@repo/domain/onboarding-answers";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { admit } from "#src/games/admit";
import {
  assertGameOrganizer,
  type GameRow,
  requireGame,
} from "#src/games/access";
import { assertOrganizerAddFormat } from "#src/games/assert-organizer-add-format";
import { assertKeeperSeatOpen } from "#src/games/football-lineup";
import { throwIfAdmitRefused } from "#src/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import type { SeatPosition } from "#src/games/utils";
import { gameNotificationsSuppressed } from "#src/notifications/game-notifications-suppressed";
import { notify } from "#src/notifications/notify";
import {
  createUnclaimedPlayer,
  type UnclaimedPlayerStartingLevel,
} from "#src/unclaimed-players/create-unclaimed-player";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

type AddPlayerLevel = PadelLevelChoice | "not_sure" | FootballSelfPlacement;

type FootballPlacement = {
  role: FootballRole;
  position: FootballPosition | null;
};

function isFootballPlacement(
  level: AddPlayerLevel,
): level is FootballSelfPlacement {
  return (FOOTBALL_SELF_PLACEMENTS as readonly string[]).includes(level);
}

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function startingLevelFor(
  game: GameRow,
  level: AddPlayerLevel | undefined,
): UnclaimedPlayerStartingLevel {
  if (isFootballGame(game)) {
    if (level !== undefined && !isFootballPlacement(level)) {
      refuse("Pick a football Level");
    }
    return {
      sport: "football",
      placement: level ?? ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
    };
  }
  if (level !== undefined && isFootballPlacement(level)) {
    refuse("Pick a padel Level");
  }
  return { sport: "padel", level: level ?? "not_sure" };
}

/** A fully vacant side seats on the left; a Half team fills its open Position. */
async function tournamentSideSeat(
  tx: Tx,
  game: GameRow,
  sideIndex: number,
): Promise<{ sideIndex: number; position: SeatPosition }> {
  const team = await tx.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.sideIndex, sideIndex),
    ),
    with: { players: { columns: { position: true } } },
  });
  const taken = new Set(team?.players.map((link) => link.position) ?? []);
  if (!taken.has("left")) {
    return { sideIndex, position: "left" };
  }
  if (!taken.has("right")) {
    return { sideIndex, position: "right" };
  }
  throw new TRPCError({ code: "CONFLICT", message: "That side is full" });
}

async function seatFor(
  tx: Tx,
  game: GameRow,
  args: {
    seat?: { sideIndex: number; position: SeatPosition };
    side?: { sideIndex: number };
  },
) {
  if (game.format === "friendly_tournament") {
    if (!args.side) {
      refuse("Pick a side");
    }
    return tournamentSideSeat(tx, game, args.side.sideIndex);
  }
  if (game.format === "friendly_game" && !isFootballGame(game)) {
    return args.seat;
  }
  return undefined;
}

export async function addPlayerByPhone(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    countryIso: string;
    nationalNumber: string;
    name?: string;
    level?: AddPlayerLevel;
    seat?: { sideIndex: number; position: SeatPosition };
    side?: { sideIndex: number };
    football?: FootballPlacement;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);
  assertOrganizerAddFormat(game);
  if (args.football && !isFootballGame(game)) {
    refuse("Only a football Game takes a role and position");
  }
  const football: FootballPlacement | null = isFootballGame(game)
    ? (args.football ?? { role: "outfield", position: null })
    : null;
  const startingLevel = startingLevelFor(game, args.level);
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber);
  const name = args.name?.trim();

  return database.transaction(async (tx) => {
    const resolved = await resolvePhonePlayer(tx, phoneNumber);
    let player;
    if (resolved.kind === "new") {
      if (!name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter their name",
        });
      }
      ({ user: player } = await createUnclaimedPlayer(tx, {
        phoneNumber,
        name,
        addedByUserId: args.organizerUserId,
        startingLevel,
      }));
    } else {
      player = resolved.user;
    }

    if (await userAlreadyOnGame(tx, game.id, player.id)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${player.name} is already on this Game`,
      });
    }
    if (await userAlreadyWaitlisted(tx, game.id, player.id)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${player.name} is on the waitlist`,
      });
    }
    if (football?.role === "keeper") {
      await assertKeeperSeatOpen(tx, game.id);
    }

    const admitted = await admit(tx, {
      game,
      door: "organizer_add",
      party: {
        kind: "user",
        userId: player.id,
        seat: await seatFor(tx, game, args),
      },
      addedByUserId: args.organizerUserId,
    });
    if (!admitted.ok && admitted.reason === "full") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Game is full",
      });
    }
    throwIfAdmitRefused(admitted);

    if (football) {
      await tx
        .update(gamePlayers)
        .set({
          footballRole: football.role,
          footballPosition: football.position,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(gamePlayers.gameId, game.id),
            eq(gamePlayers.userId, player.id),
          ),
        );
    }

    if (
      resolved.kind === "account" &&
      !(await gameNotificationsSuppressed(tx, game))
    ) {
      await notify(tx, {
        type: "game_seated_by_organizer",
        recipients: [{ userId: player.id, audience: "player" }],
        excludeUserIds: [args.organizerUserId],
        actorUserId: args.organizerUserId,
        groupId: game.groupId,
        gameId: game.id,
      });
    }

    return {
      userId: player.id,
      kind: resolved.kind,
      name: player.name,
    };
  });
}

export const addPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
      name: z.string().trim().min(1).max(100).optional(),
      level: z
        .union([
          z.enum(ASSIGNABLE_DISPLAY_LEVEL_BANDS),
          z.literal("not_sure"),
          z.enum(FOOTBALL_SELF_PLACEMENTS),
        ])
        .optional(),
      seat: z
        .object({
          sideIndex: z.number().int().min(1),
          position: z.enum(["left", "right"]),
        })
        .optional(),
      side: z.object({ sideIndex: z.number().int().min(1) }).optional(),
      football: z
        .object({
          role: footballRoleSchema,
          position: footballPositionSchema.nullable(),
        })
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addPlayerByPhone(ctx.db, {
      ...input,
      organizerUserId: appUser.id,
    });
  });
