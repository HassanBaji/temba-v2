import { TRPCError } from "@trpc/server";

import { user } from "@repo/db";
import {
  selfDeclareChoiceFromFootballPlacement,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import { selfDeclareChoiceFromDisplay } from "@repo/domain/level-bands";
import {
  PADEL_NOT_SURE_LEVEL,
  type PadelLevelChoice,
} from "@repo/domain/onboarding-answers";

import { type db } from "#src/db";
import { selfDeclareRating } from "#src/routers/ratings/selfDeclare";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type UnclaimedPlayerStartingLevel =
  | { sport: "padel"; level: PadelLevelChoice | "not_sure" }
  | { sport: "football"; placement: FootballSelfPlacement };

function selfDeclareChoice(startingLevel: UnclaimedPlayerStartingLevel) {
  if (startingLevel.sport === "football") {
    return selfDeclareChoiceFromFootballPlacement(startingLevel.placement);
  }
  return selfDeclareChoiceFromDisplay(
    startingLevel.level === "not_sure"
      ? PADEL_NOT_SURE_LEVEL
      : startingLevel.level,
  );
}

export async function createUnclaimedPlayer(
  database: DbClient,
  args: {
    phoneNumber: string;
    name: string;
    addedByUserId: string;
    startingLevel: UnclaimedPlayerStartingLevel;
  },
) {
  const [created] = await database
    .insert(user)
    .values({
      name: args.name,
      phoneNumber: args.phoneNumber,
      addedByUserId: args.addedByUserId,
      addedAt: new Date(),
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add the player",
    });
  }

  const rating = await selfDeclareRating(
    database,
    created.id,
    args.startingLevel.sport,
    selfDeclareChoice(args.startingLevel),
  );

  return { user: created, rating };
}
