import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createTRPCClient, httpLink } from "@trpc/client";
import SuperJSON from "superjson";

import { type AppRouter } from "@repo/api/types";
import { env } from "~/env";

export async function createApiClient({
  signedIn = false,
}: { signedIn?: boolean } = {}) {
  const token = signedIn ? await (await auth()).getToken() : null;
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        transformer: SuperJSON,
        url: `${env.API_ORIGIN}/api/trpc`,
        headers: () => (token ? { authorization: `Bearer ${token}` } : {}),
      }),
    ],
  });
}
