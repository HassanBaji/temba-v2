import { TRPCError } from "@trpc/server";
import { type Locale, DEFAULT_LOCALE } from "@repo/i18n/locale";
import { and, eq } from "drizzle-orm";

import { gamePlayers, gameTeams } from "@repo/db";

import type {
  FootballPosition,
  FootballRole,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";
import { admit } from "#src/games/admit";
import { type GameRow, lockGameForAdmit } from "#src/games/access";
import { assertKeeperSeatOpen } from "#src/games/football-lineup";
import { throwIfAdmitRefused } from "#src/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import { firstVacantPosition } from "#src/games/seats";
import type { SeatPosition } from "#src/games/utils";
import { notify } from "#src/notifications/notify";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FootballPlacement = {
  role: FootballRole;
  position: FootballPosition | null;
};

export type OrganizerAddPlacement = {
  seat?: { sideIndex: number; position: SeatPosition };
  side?: { sideIndex: number };
};

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/** A fully vacant side seats on the left; a Half team fills its open Position. */
async function tournamentSideSeat(
  tx: Tx,
  game: GameRow,
  sideIndex: number,
  locale: Locale = DEFAULT_LOCALE,
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
  throw new TRPCError({
    code: "CONFLICT",
    message: messagesFor(locale).game.errors.sideFull,
  });
}

/**
 * The seat an Organizer add takes. With `fillVacant`, a padel Game or
 * tournament left unplaced takes the first vacant Position, so several
 * Group members can be added in one go.
 */
async function organizerAddSeat(
  tx: Tx,
  game: GameRow,
  placement: OrganizerAddPlacement,
  fillVacant = false,
  locale: Locale = DEFAULT_LOCALE,
) {
  const seats =
    game.format === "friendly_tournament" ||
    (game.format === "friendly_game" && !isFootballGame(game));
  if (!seats) {
    return undefined;
  }
  if (game.format === "friendly_tournament" && placement.side) {
    return tournamentSideSeat(tx, game, placement.side.sideIndex, locale);
  }
  if (game.format === "friendly_game" && placement.seat) {
    return placement.seat;
  }
  if (fillVacant) {
    const vacant = await firstVacantPosition(tx, game);
    if (!vacant) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).game.errors.full,
      });
    }
    return vacant;
  }
  if (game.format === "friendly_tournament") {
    refuse(messagesFor(locale).game.sides.pickASide);
  }
  return undefined;
}

/** Seats one resolved player on an Organizer add, then tells them if they can be told. */
export async function organizerAddPlayer(
  tx: Tx,
  args: {
    game: GameRow;
    player: { id: string; name: string };
    organizerUserId: string;
    placement: OrganizerAddPlacement;
    /** See `organizerAddSeat`. */
    fillVacant?: boolean;
    football: FootballPlacement | null;
    notifyPlayer: boolean;
    locale: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const { player } = args;
  const game = await lockGameForAdmit(tx, args.game.id, locale);
  if (await userAlreadyOnGame(tx, game.id, player.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.playerAlreadyOn(player.name),
    });
  }
  if (await userAlreadyWaitlisted(tx, game.id, player.id)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.playerWaitlisted(player.name),
    });
  }
  if (args.football?.role === "keeper") {
    await assertKeeperSeatOpen(tx, game.id, undefined, locale);
  }

  const admitted = await admit(tx, {
    game,
    door: "organizer_add",
    party: {
      kind: "user",
      userId: player.id,
      seat: await organizerAddSeat(
        tx,
        game,
        args.placement,
        args.fillVacant,
        locale,
      ),
    },
    addedByUserId: args.organizerUserId,
    locale,
  });
  if (!admitted.ok && admitted.reason === "full") {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.full,
    });
  }
  throwIfAdmitRefused(admitted, args.locale);

  if (args.football) {
    await tx
      .update(gamePlayers)
      .set({
        footballRole: args.football.role,
        footballPosition: args.football.position,
        updatedAt: new Date(),
      })
      .where(
        and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, player.id)),
      );
  }

  if (args.notifyPlayer) {
    await notify(tx, {
      type: "game_seated_by_organizer",
      recipients: [{ userId: player.id, audience: "player" }],
      excludeUserIds: [args.organizerUserId],
      actorUserId: args.organizerUserId,
      groupId: game.groupId,
      gameId: game.id,
    });
  }
}
