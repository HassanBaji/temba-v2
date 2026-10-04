import { auth, currentUser } from "@clerk/nextjs/server";

import { env } from "~/env";
import { type TRPCContextHost } from "~/server/api/trpc";

export async function clerkContextHost(
  headers: Headers,
): Promise<TRPCContextHost> {
  const { userId } = await auth();
  return {
    userId,
    getPublicMetadata: async () => (await currentUser())?.publicMetadata,
    headers,
    webOrigin: env.WEB_ORIGIN,
  };
}
