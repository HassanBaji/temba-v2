import { TRPCError } from "@trpc/server";

import { communities, communitySports, CommunityRoleEnum } from "@repo/db";

import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "~/server/community-membership";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function createCommunity(
  database: DbClient,
  args: {
    name: string;
    description?: string;
    type: "public" | "private";
    sports: ("padel" | "football")[];
    userId: string;
  },
) {
  const uniqueSports = [...new Set(args.sports)];
  if (uniqueSports.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one sport is required",
    });
  }

  return database.transaction(async (tx) => {
    const [created] = await tx
      .insert(communities)
      .values({
        name: args.name,
        description: args.description,
        type: args.type,
        createdBy: args.userId,
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create community",
      });
    }

    throwAdmitFailure(
      await admitCommunityMember(tx, {
        communityId: created.id,
        userId: args.userId,
        role: CommunityRoleEnum.OWNER,
      }),
    );

    await tx.insert(communitySports).values(
      uniqueSports.map((sport) => ({
        communityId: created.id,
        sport,
      })),
    );

    return created;
  });
}
