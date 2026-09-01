import { and, eq } from "drizzle-orm";

import { communities, communityMembers } from "@repo/db";

import { type db } from "~/server/db";
import type {
  AdmitArgs,
  AdmitResult,
  MembershipDb,
} from "~/server/community-membership/utils";

function writeDb(database: MembershipDb): typeof db {
  return database as typeof db;
}

export async function admit(
  database: MembershipDb,
  args: AdmitArgs,
): Promise<AdmitResult> {
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, args.communityId),
    columns: { id: true },
  });
  if (!community) {
    return { ok: false, reason: "not_found" };
  }

  const existing = await database.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, args.communityId),
      eq(communityMembers.userId, args.userId),
    ),
    columns: { id: true, role: true },
  });
  if (existing) {
    return { ok: false, reason: "already_member" };
  }

  const [inserted] = await writeDb(database)
    .insert(communityMembers)
    .values({
      communityId: args.communityId,
      userId: args.userId,
      role: args.role,
    })
    .returning({
      id: communityMembers.id,
      role: communityMembers.role,
    });
  if (!inserted) {
    return { ok: false, reason: "already_member" };
  }

  return {
    ok: true,
    id: inserted.id,
    communityId: args.communityId,
    userId: args.userId,
    role: inserted.role,
  };
}
