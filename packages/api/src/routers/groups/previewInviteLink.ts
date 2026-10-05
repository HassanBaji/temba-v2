import { z } from "zod";

import { publicProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { previewLink } from "#src/invites/doors";

type DbClient = typeof db;

export async function previewInviteLink(
  database: DbClient,
  args: { token: string },
) {
  const previewed = await previewLink(database, "group", args.token);
  if (previewed.status === "ready") {
    return { status: "ready" as const, groupName: previewed.name };
  }
  return { status: previewed.status };
}

export const previewInviteLinkProcedure = publicProcedure
  .input(z.object({ token: z.string().min(1).max(64) }))
  .query(async ({ ctx, input }) => {
    return previewInviteLink(ctx.db, { token: input.token });
  });
