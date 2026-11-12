import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { isOperatorPublicMetadata } from "@repo/api/auth/require-operator";
import {
  createTRPCContext,
  requestLocale,
  type TRPCContextHost,
} from "@repo/api/trpc";

type Db = TRPCContextHost["db"];

export type Authenticate = (request: Request) => Promise<{
  userId: string | null;
  getPublicMetadata: TRPCContextHost["getPublicMetadata"];
  listOperatorClerkIds?: TRPCContextHost["listOperatorClerkIds"];
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

const CLERK_USER_PAGE = 500;
const OPERATOR_LIST_TTL_MS = 5 * 60 * 1000;

/**
 * Every Operator's Clerk id. Clerk cannot filter users on public metadata, so
 * the list is read page by page and kept for a few minutes; a failed read is
 * not kept.
 */
export function clerkOperatorDirectory(
  clerk: ClerkClient,
  now: () => number = Date.now,
): () => Promise<string[]> {
  let cached: { at: number; ids: Promise<string[]> } | undefined;
  async function load() {
    const ids: string[] = [];
    for (let offset = 0; ; offset += CLERK_USER_PAGE) {
      const page = await clerk.users.getUserList({
        limit: CLERK_USER_PAGE,
        offset,
      });
      for (const user of page.data) {
        if (isOperatorPublicMetadata(user.publicMetadata)) {
          ids.push(user.id);
        }
      }
      if (page.data.length < CLERK_USER_PAGE) {
        return ids;
      }
    }
  }
  return () => {
    if (!cached || now() - cached.at > OPERATOR_LIST_TTL_MS) {
      const ids = load();
      const entry = { at: now(), ids };
      cached = entry;
      ids.catch(() => {
        if (cached === entry) {
          cached = undefined;
        }
      });
    }
    return cached.ids;
  };
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
  const listOperatorClerkIds = clerkOperatorDirectory(clerk);
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
      listOperatorClerkIds,
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
      locale: requestLocale(request.headers),
    });
  };
}
