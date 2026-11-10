import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { publicProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { findGroupInviteLinkByShortCode } from "#src/invites/doors";
import { groupInviteLinkOpenGraph } from "#src/invites/group-invite-open-graph";

type DbClient = typeof db;

export async function inviteLinkByShortCode(
  database: DbClient,
  args: { code: string; locale?: Locale },
) {
  const link = await findGroupInviteLinkByShortCode(database, args.code);
  const openGraph = await groupInviteLinkOpenGraph(
    database,
    link,
    args.locale ?? DEFAULT_LOCALE,
  );
  return {
    token: link?.token ?? null,
    title: openGraph.title,
    description: openGraph.description,
    image: openGraph.image,
  };
}

export const inviteLinkByShortCodeProcedure = publicProcedure
  .input(z.object({ code: z.string().min(1).max(64) }))
  .query(({ ctx, input }) =>
    inviteLinkByShortCode(ctx.db, { ...input, locale: ctx.locale }),
  );
