import { z } from "zod";

import { publicProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { findGameInviteLinkByShortCode } from "#src/invites/doors";
import { loadGameInviteOpenGraph } from "#src/invites/game-invite-open-graph";

type DbClient = typeof db;

export async function inviteLinkByShortCode(
  database: DbClient,
  args: { code: string },
) {
  const link = await findGameInviteLinkByShortCode(database, args.code);
  const openGraph = await loadGameInviteOpenGraph(database, args.code);
  return {
    token: link?.token ?? null,
    title: openGraph.title,
    description: openGraph.description,
  };
}

export const inviteLinkByShortCodeProcedure = publicProcedure
  .input(z.object({ code: z.string().min(1).max(64) }))
  .query(({ ctx, input }) => inviteLinkByShortCode(ctx.db, input));
