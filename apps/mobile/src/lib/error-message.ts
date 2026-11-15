export type ErrorCopy = { somethingWentWrong: string; offline: string };

const NETWORK_FAILURE =
  /network request failed|failed to fetch|load failed|network error/i;

function rawMessage(error: unknown): unknown {
  if (error && typeof error === "object" && "message" in error) {
    return error.message;
  }
  return error;
}

/** The error's own text, or `null` when it has none worth showing. */
function messageOf(error: unknown): string | null {
  const raw = rawMessage(error);
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  return raw.trim();
}

/** A tRPC client error carries `data` and `shape`, both undefined when no server answered. */
function trpcData(error: unknown): { found: boolean; code?: unknown } {
  if (!error || typeof error !== "object" || !("shape" in error)) {
    return { found: false };
  }
  const { data } = error as { data?: { code?: unknown } | null };
  return data ? { found: true, code: data.code } : { found: true };
}

/**
 * What a User reads when something fails. A coded server error keeps the
 * server's own message. A request that never reached the API, or that crashed
 * there, shows the shared copy instead of React Native's "Network request
 * failed" or a stack trace.
 */
export function errorMessage(
  error: unknown,
  copy: ErrorCopy,
  online: boolean,
): string {
  const failed = online ? copy.somethingWentWrong : copy.offline;
  const message = messageOf(error);
  const trpc = trpcData(error);
  if (trpc.found) {
    if (trpc.code === undefined) {
      return failed;
    }
    if (trpc.code === "INTERNAL_SERVER_ERROR") {
      return copy.somethingWentWrong;
    }
    return message ?? failed;
  }
  if (!message || NETWORK_FAILURE.test(message)) {
    return failed;
  }
  return message;
}
