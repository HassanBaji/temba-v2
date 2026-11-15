import { describe, expect, it } from "vitest";

import { QUERY_RETRY_LIMIT, shouldRetryQuery } from "./query-retry";

const withStatus = (httpStatus: number) => ({ data: { httpStatus } });

describe("shouldRetryQuery", () => {
  it("does not retry answers that a retry cannot change", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetryQuery(0, withStatus(status))).toBe(false);
    }
  });

  it("retries server errors, timeouts and rate limits", () => {
    for (const status of [408, 429, 500, 502, 503]) {
      expect(shouldRetryQuery(0, withStatus(status))).toBe(true);
    }
  });

  it("retries network failures that carry no status", () => {
    expect(shouldRetryQuery(0, new TypeError("Network request failed"))).toBe(
      true,
    );
    expect(shouldRetryQuery(0, { data: null })).toBe(true);
  });

  it("stops at the retry limit", () => {
    expect(shouldRetryQuery(QUERY_RETRY_LIMIT - 1, withStatus(500))).toBe(true);
    expect(shouldRetryQuery(QUERY_RETRY_LIMIT, withStatus(500))).toBe(false);
  });
});
