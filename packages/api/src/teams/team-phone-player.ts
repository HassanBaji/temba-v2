import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { teamMembers, user } from "@repo/db";
import { ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL } from "@repo/domain/add-player-by-phone";
import {
  FOOTBALL_SELF_PLACEMENTS,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import type { PadelLevelChoice } from "@repo/domain/onboarding-answers";
import { type Sport } from "@repo/domain/sport";
import { teamRosterRule } from "@repo/domain/team-roster";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import { unorderedPairIsReserved } from "#src/teams/helpers/unordered-pair-is-reserved";
import {
  createUnclaimedPlayer,
  type UnclaimedPlayerStartingLevel,
} from "#src/unclaimed-players/create-unclaimed-player";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** One By phone entry, shared by `teams.addPlayerByPhone` and `teams.create`. */
export const teamPhonePlayerSchema = z.object({
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
  football: z
    .object({
      role: footballRoleSchema,
      position: footballPositionSchema.nullable(),
    })
    .optional(),
});

export type TeamPhonePlayerInput = z.infer<typeof teamPhonePlayerSchema>;

type AddPlayerLevel = PadelLevelChoice | "not_sure" | FootballSelfPlacement;

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function isFootballPlacement(
  level: AddPlayerLevel,
): level is FootballSelfPlacement {
  return (FOOTBALL_SELF_PLACEMENTS as readonly string[]).includes(level);
}

function startingLevelFor(
  sport: Sport,
  level: AddPlayerLevel | undefined,
  locale: Locale = DEFAULT_LOCALE,
): UnclaimedPlayerStartingLevel {
  if (sport === "football") {
    if (level !== undefined && !isFootballPlacement(level)) {
      refuse(messagesFor(locale).level.errors.pickFootball);
    }
    return {
      sport: "football",
      placement: level ?? ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
    };
  }
  if (level !== undefined && isFootballPlacement(level)) {
    refuse(messagesFor(locale).level.errors.pickPadel);
  }
  return { sport: "padel", level: level ?? "not_sure" };
}

type TeamForPhone = { id: string; sport: Sport };

/**
 * Checks a By phone entry before anything is written: a well-formed number, a
 * Level of the Team's sport, and a football role only on a football Team.
 */
export function parseTeamPhonePlayer(
  team: Pick<TeamForPhone, "sport">,
  input: TeamPhonePlayerInput,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (input.football && team.sport !== "football") {
    refuse(messagesFor(locale).team.errors.roleOnFootballTeam);
  }
  return {
    phoneNumber: requireE164(input.countryIso, input.nationalNumber, locale),
    name: input.name?.trim(),
    startingLevel: startingLevelFor(team.sport, input.level, locale),
    football: input.football ?? null,
  };
}

export type ParsedTeamPhonePlayer = ReturnType<typeof parseTeamPhonePlayer>;

/**
 * A number on Temba is never added outright: membership is standing, so its
 * holder gets a Lookup invite to accept (the caller mints it). A number not on
 * Temba joins the Roster by name, reusing the one Unclaimed row per phone.
 */
export async function addPhonePlayerToTeam(
  tx: Tx,
  args: {
    team: TeamForPhone;
    captainUserId: string;
    player: ParsedTeamPhonePlayer;
    locale?: Locale;
  },
): Promise<
  | { outcome: "account"; user: { id: string; name: string } }
  | { outcome: "added"; user: { id: string; name: string } }
> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const { team, player } = args;
  const resolved = await resolvePhonePlayer(tx, player.phoneNumber);
  if (resolved.kind === "account") {
    return { outcome: "account", user: resolved.user };
  }

  let unclaimed;
  if (resolved.kind === "new") {
    if (!player.name) {
      refuse(messagesFor(locale).profile.errors.enterTheirName);
    }
    ({ user: unclaimed } = await createUnclaimedPlayer(tx, {
      phoneNumber: player.phoneNumber,
      name: player.name,
      addedByUserId: args.captainUserId,
      startingLevel: player.startingLevel,
      locale,
    }));
    // The Matchday squad seat reads the role from the User, so a new
    // player's picked role is written there; nobody else's is overwritten.
    if (player.football) {
      await tx
        .update(user)
        .set({
          preferredFootballRole: player.football.role,
          preferredFootballPosition:
            player.football.role === "keeper" ? null : player.football.position,
          updatedAt: new Date(),
        })
        .where(eq(user.id, unclaimed.id));
    }
  } else {
    unclaimed = resolved.user;
  }

  const existing = await tx.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, unclaimed.id),
    ),
    columns: { id: true },
  });
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).team.errors.playerAlreadyOnRoster(
        unclaimed.name,
      ),
    });
  }
  if (
    teamRosterRule(team.sport).pairIsUnique &&
    (await unorderedPairIsReserved(tx, args.captainUserId, unclaimed.id))
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).team.errors.pairTaken,
    });
  }

  await tx
    .insert(teamMembers)
    .values({ teamId: team.id, userId: unclaimed.id });
  return { outcome: "added", user: unclaimed };
}
