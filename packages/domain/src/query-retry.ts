export const QUERY_RETRY_LIMIT = 3;

function httpStatusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }
  const data = error.data;
  if (typeof data !== "object" || data === null || !("httpStatus" in data)) {
    return null;
  }
  const status = data.httpStatus;
  return typeof status === "number" ? status : null;
}

/**
 * Whether a failed query is worth asking again. A 4xx answer (not found,
 * forbidden, bad input) will not change on a retry, except 408 and 429,
 * which ask the client to come back later.
 */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= QUERY_RETRY_LIMIT) {
    return false;
  }
  const status = httpStatusOf(error);
  if (status === null || status === 408 || status === 429) {
    return true;
  }
  return status < 400 || status >= 500;
}
