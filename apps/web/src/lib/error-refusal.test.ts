import { describe, expect, it } from "vitest";

import { errorRefusal } from "./error-refusal";

describe("errorRefusal", () => {
  it("reads FORBIDDEN as a forbidden refusal", () => {
    expect(errorRefusal({ data: { code: "FORBIDDEN" } })).toBe("forbidden");
  });

  it("reads NOT_FOUND as a not-found refusal", () => {
    expect(errorRefusal({ data: { code: "NOT_FOUND" } })).toBe("notFound");
  });

  it("treats other failures, a lapsed session included, as retryable", () => {
    expect(errorRefusal({ data: { code: "UNAUTHORIZED" } })).toBe(null);
    expect(errorRefusal({ data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(
      null,
    );
    expect(errorRefusal({ message: "Failed to fetch" })).toBe(null);
    expect(errorRefusal({ data: null })).toBe(null);
    expect(errorRefusal(null)).toBe(null);
  });
});
