import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import {
  cabinetView,
  isRoast,
  type CabinetGroup,
  type CoinKind,
  type MvpDecidedBy,
} from "@repo/domain/marks";
import { SPORTS, type Sport } from "@repo/domain/sport";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { loadReceivedCoins, type CabinetGame } from "#src/marks/received-coins";
import {
  matchHistoryHidden,
  mayViewPlayer,
} from "#src/routers/users/playerProfile";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CabinetKind = {
  kind: CoinKind;
  group: CabinetGroup;
  count: number;
  hiddenFromOthers: boolean;
  /** The newest one; no giver for an MVP. */
  lastFrom: {
    giverUserId: string | null;
    giverName: string | null;
    gameId: string;
    game: CabinetGame;
    playedAt: Date;
  } | null;
};

export type CabinetSport = {
  total: number;
  mvpCount: number;
  mvpDecidedBy: Record<MvpDecidedBy, number>;
  kinds: CabinetKind[];
  kindsNotYet: number;
};

export type Cabinet =
  | { hidden: true }
  | {
      hidden: false;
      isOwner: boolean;
      /** The owner's setting, shown only to the owner. */
      hideRoasts: boolean | null;
      sports: Sport[];
      perSport: Record<Sport, CabinetSport>;
    };

const notFound = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Player not found" });

/**
 * A User's Marks and MVPs per sport, for their Player profile. Whoever may
 * see the profile sees the cabinet, unless the owner's Match history
 * visibility excludes them: marks are history. When the owner hides Roasts,
 * other viewers get no trace of them. Tabs are the sports the User has coins
 * in or plays; a User with neither sees both.
 */
export async function cabinet(
  database: DbClient,
  args: { viewerId: string; playerId: string },
): Promise<Cabinet> {
  if (!(await mayViewPlayer(database, args))) {
    throw notFound();
  }
  const owner = await database.query.user.findFirst({
    where: eq(user.id, args.playerId),
    columns: {
      id: true,
      sports: true,
      hideRoasts: true,
      matchHistoryVisibility: true,
    },
  });
  if (!owner) {
    throw notFound();
  }
  if (
    await matchHistoryHidden(database, {
      viewerId: args.viewerId,
      playerId: owner.id,
      visibility: owner.matchHistoryVisibility,
    })
  ) {
    return { hidden: true };
  }

  const isOwner = owner.id === args.viewerId;
  const coins = await loadReceivedCoins(database, { userId: owner.id });
  const visible =
    owner.hideRoasts && !isOwner
      ? coins.filter((coin) => !isRoast(coin.kind))
      : coins;

  const perSport = Object.fromEntries(
    SPORTS.map((sport) => {
      const view = cabinetView({
        entries: coins,
        sport,
        viewerIsOwner: isOwner,
        hideRoasts: owner.hideRoasts,
      });
      return [
        sport,
        {
          total: view.total,
          mvpCount: view.mvpCount,
          mvpDecidedBy: view.mvpDecidedBy,
          kindsNotYet: view.kindsNotYet,
          kinds: view.kinds.map(({ last, ...kind }) => ({
            ...kind,
            lastFrom: last && {
              giverUserId: last.giver?.userId ?? null,
              giverName: last.giver?.name ?? null,
              gameId: last.gameId,
              game: last.game,
              playedAt: last.playedAt,
            },
          })),
        },
      ];
    }),
  ) as Record<Sport, CabinetSport>;

  const tabs = SPORTS.filter(
    (sport) =>
      (owner.sports ?? []).includes(sport) ||
      visible.some((coin) => coin.sport === sport),
  );

  return {
    hidden: false,
    isOwner,
    hideRoasts: isOwner ? owner.hideRoasts : null,
    sports: tabs.length > 0 ? tabs : [...SPORTS],
    perSport,
  };
}

export const cabinetProcedure = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cabinet(ctx.db, { viewerId: appUser.id, playerId: input.userId });
  });
