import { aliasedTable, and, countDistinct, eq, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, games, ratings, teamMembers } from "@repo/db";
import type {
  FootballPosition,
  FootballRole,
} from "@repo/domain/football-lineup";
import type { LevelBand } from "@repo/domain/level-bands";
import { type Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { peopleTheViewerPlaysWith } from "#src/teams/helpers/people-the-viewer-plays-with";
import { requireIncompleteTeamCreator } from "#src/teams/helpers/require-incomplete-team-creator";
import { unusedLookupInvitesForTeam } from "#src/teams/helpers/unused-invites-for-team";
import { maskPhone } from "#src/unclaimed-players/mask-phone";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;

export type TeamPhonePlayerPreview = {
  kind: "account" | "unclaimed" | "new";
  name: string | null;
  alreadyOnTeam: boolean;
  alreadyInvited: boolean;
  phoneMasked?: string;
  /** Set for someone already on Temba: their Level in the Team's sport. */
  levelBand?: LevelBand | null;
  footballRole?: FootballRole | null;
  footballPosition?: FootballPosition | null;
  /** Games the viewer and this player were both in, cancelled ones aside. */
  gamesWithYou?: number;
};

const viewerSeat = aliasedTable(gamePlayers, "viewer_seat");

async function gamesTogether(
  database: DbClient,
  viewerId: string,
  playerId: string,
) {
  const [row] = await database
    .select({ total: countDistinct(gamePlayers.gameId) })
    .from(gamePlayers)
    .innerJoin(viewerSeat, eq(viewerSeat.gameId, gamePlayers.gameId))
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(
      and(
        eq(gamePlayers.userId, playerId),
        eq(viewerSeat.userId, viewerId),
        isNull(games.cancelledAt),
        lte(games.windowStart, new Date()),
      ),
    );
  return Number(row?.total ?? 0);
}

async function playerDetails(
  database: DbClient,
  args: {
    player: {
      id: string;
      preferredFootballRole: FootballRole | null;
      preferredFootballPosition: FootballPosition | null;
    };
    viewerId: string;
    sport: Sport | null;
  },
) {
  const rating = args.sport
    ? await database.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, args.player.id),
          eq(ratings.sport, args.sport),
        ),
        columns: { levelBand: true },
      })
    : undefined;
  const football = args.sport === "football";
  return {
    levelBand: rating?.levelBand ?? null,
    footballRole: football ? args.player.preferredFootballRole : null,
    footballPosition: football ? args.player.preferredFootballPosition : null,
    gamesWithYou: await gamesTogether(database, args.viewerId, args.player.id),
  };
}

/**
 * Who a number belongs to, for the Captain's By phone tab. Without a Team it
 * serves the New team screen, where nothing is on the Roster yet but the
 * viewer: there it names only someone the viewer already plays with, and
 * answers anyone else's number with whether it is on Temba and its mask.
 */
export async function previewPlayerByPhone(
  database: DbClient,
  args: {
    teamId?: string;
    userId: string;
    countryIso: string;
    nationalNumber: string;
    /** The sport picked on New team, when there is no Team yet. */
    sport?: Sport;
    locale?: Locale;
  },
): Promise<TeamPhonePlayerPreview> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const team = args.teamId
    ? (
        await requireIncompleteTeamCreator(
          database,
          args.teamId,
          args.userId,
          locale,
        )
      ).team
    : null;
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber, locale);

  const resolved = await resolvePhonePlayer(database, phoneNumber);
  if (resolved.kind === "new") {
    return {
      kind: "new",
      name: null,
      alreadyOnTeam: false,
      alreadyInvited: false,
    };
  }

  const player = resolved.user;
  if (
    !team &&
    player.id !== args.userId &&
    !(await peopleTheViewerPlaysWith(database, args.userId)).includes(player.id)
  ) {
    return {
      kind: resolved.kind,
      name: null,
      alreadyOnTeam: false,
      alreadyInvited: false,
      phoneMasked: maskPhone(phoneNumber),
    };
  }

  const membership = team
    ? await database.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, player.id),
        ),
        columns: { id: true },
      })
    : undefined;
  const alreadyOnTeam = player.id === args.userId || membership !== undefined;
  const alreadyInvited = team
    ? (await unusedLookupInvitesForTeam(database, team.id)).some(
        (invite) => invite.userId === player.id,
      )
    : false;
  const details = await playerDetails(database, {
    player,
    viewerId: args.userId,
    sport: team?.sport ?? args.sport ?? null,
  });

  if (resolved.kind === "account") {
    return {
      kind: "account",
      name: player.name,
      alreadyOnTeam,
      alreadyInvited,
      ...details,
    };
  }
  return {
    kind: "unclaimed",
    name: player.name,
    alreadyOnTeam,
    alreadyInvited,
    phoneMasked: maskPhone(phoneNumber),
    ...details,
  };
}

export const previewPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid().optional(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
      sport: sportSchema.optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.phonePreview, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return previewPlayerByPhone(ctx.db, {
      teamId: input.teamId,
      userId: appUser.id,
      countryIso: input.countryIso,
      nationalNumber: input.nationalNumber,
      sport: input.sport,
      locale: ctx.locale,
    });
  });
