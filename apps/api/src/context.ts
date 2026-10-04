import { createClerkClient } from "@clerk/backend";
import { createTRPCContext, type TRPCContextHost } from "@repo/api/trpc";

type Db = TRPCContextHost["db"];

export type Authenticate = (request: Request) => Promise<{
  userId: string | null;
  getPublicMetadata: TRPCContextHost["getPublicMetadata"];
}>;

export function clerkAuthenticator(config: {
  secretKey: string;
  publishableKey: string;
}): Authenticate {
  const clerk = createClerkClient(config);
  return async (request) => {
    const requestState = await clerk.authenticateRequest(request, {
      acceptsToken: "session_token",
    });
    const userId = requestState.toAuth()?.userId ?? null;
    return {
      userId,
      getPublicMetadata: async () =>
        userId ? (await clerk.users.getUser(userId)).publicMetadata : undefined,
    };
  };
}

export function contextFor(options: {
  db: Db;
  authenticate: Authenticate;
  webOrigin: string;
}) {
  return async (request: Request) => {
    const session = await options.authenticate(request);
    return createTRPCContext({
      ...session,
      db: options.db,
      headers: request.headers,
      webOrigin: options.webOrigin,
    });
  };
}
