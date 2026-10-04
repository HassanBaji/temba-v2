import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@repo/db";

import { env } from "~/env";
import { type TRPCContextHost } from "@repo/api/trpc";

export async function clerkContextHost(
  headers: Headers,
): Promise<TRPCContextHost> {
  const { userId } = await auth();
  return {
    db,
    userId,
    getPublicMetadata: async () => (await currentUser())?.publicMetadata,
    headers,
    webOrigin: env.WEB_ORIGIN,
  };
}
