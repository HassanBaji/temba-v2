import { describe, expect, it } from "vitest";

import { toApiOrigin } from "~/lib/api-origin";

describe("toApiOrigin", () => {
  it("keeps a full origin and drops a trailing slash", () => {
    expect(toApiOrigin("https://api.temba.app/")).toBe("https://api.temba.app");
    expect(toApiOrigin("http://localhost:4000")).toBe("http://localhost:4000");
  });

  it("reaches a Railway private host over plain HTTP", () => {
    expect(toApiOrigin("api.railway.internal:4000")).toBe(
      "http://api.railway.internal:4000",
    );
  });

  it("reaches a loopback host over plain HTTP", () => {
    expect(toApiOrigin("localhost:4000")).toBe("http://localhost:4000");
  });

  it("reaches any other bare host over HTTPS", () => {
    expect(toApiOrigin("api.temba.app")).toBe("https://api.temba.app");
  });

  it("treats a blank value as unset", () => {
    expect(toApiOrigin(undefined)).toBeUndefined();
    expect(toApiOrigin("  ")).toBeUndefined();
  });
});
