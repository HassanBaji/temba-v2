import type { DbClient } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, eq, isNull } from "drizzle-orm";

import { games } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  applyViewerLevelRangeToHubRows,
  queryHubGames,
  toHubListRow,
  viewerHubContext,
  viewerIsParticipantOnRow,
  type HubQueryRow,
} from "#src/games/helpers/hub-list";
import { hubGameMayBeLive } from "#src/games/helpers/hub-may-be-live";
import type { HubListRow } from "#src/games/utils";
import { filterAndSortPublicHubGames } from "#src/home/upcoming-games";

export async function listPublicHubRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE,
): Promise<HubListRow[]> {
  const viewer = await viewerHubContext(database, userId, locale);
  const rows = await queryHubGames(
    database,
    and(
      eq(games.isPublic, true),
      isNull(games.cancelledAt),
      hubGameMayBeLive(database, now),
    ),
  );
  const candidates = (rows as HubQueryRow[]).map((row) => ({
    ...row,
    viewerIsParticipant: viewerIsParticipantOnRow(row, viewer),
  }));
  const filtered = filterAndSortPublicHubGames(
    candidates,
    viewer.memberGroupIds,
    viewer.userId,
    now,
  );
  return applyViewerLevelRangeToHubRows(
    database,
    filtered.map((row) => toHubListRow(row, viewer, now)),
    filtered,
    userId,
  );
}

/**
 * The Games hub Public tab (parent events). Live `isPublic` Games only, the
 * groupless Public Games at partner Venues included. Games already listed on
 * My Games are excluded (My Games preferred).
 */
export const listPublicPickup = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listPublicHubRows(ctx.db, appUser.id, new Date(), ctx.locale);
});
