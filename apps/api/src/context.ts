import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { createTRPCContext, type TRPCContextHost } from "@repo/api/trpc";

type Db = TRPCContextHost["db"];

export type Authenticate = (request: Request) => Promise<{
  userId: string | null;
  getPublicMetadata: TRPCContextHost["getPublicMetadata"];
}>;

const BEARER = /^Bearer\s+\S+$/i;

function memoize<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load());
}

function withoutCookies(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  return new Request(request.url, { method: request.method, headers });
}

export function clerkAuthenticator(config: {
  secretKey: string;
  publishableKey: string;
  authorizedParties: string[];
  acceptSessionCookie?: boolean;
  jwtKey?: string;
  clerk?: ClerkClient;
}): Authenticate {
  const clerk =
    config.clerk ??
    createClerkClient({
      secretKey: config.secretKey,
      publishableKey: config.publishableKey,
    });
  return async (request) => {
    const hasBearer = BEARER.test(request.headers.get("authorization") ?? "");
    const signedOut = {
      userId: null,
      getPublicMetadata: async () => undefined,
    };
    if (!hasBearer && !config.acceptSessionCookie) return signedOut;

    const requestState = await clerk.authenticateRequest(
      config.acceptSessionCookie ? request : withoutCookies(request),
      {
        acceptsToken: "session_token",
        authorizedParties: config.authorizedParties,
        ...(config.jwtKey ? { jwtKey: config.jwtKey } : {}),
      },
    );
    const userId = requestState.toAuth()?.userId ?? null;
    if (!userId) return signedOut;
    return {
      userId,
      getPublicMetadata: memoize(
        async () => (await clerk.users.getUser(userId)).publicMetadata,
      ),
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
