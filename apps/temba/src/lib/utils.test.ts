import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("keeps a named text size alongside a text colour", () => {
    expect(cn("text-meta text-muted-foreground")).toBe(
      "text-meta text-muted-foreground",
    );
    expect(cn("text-muted-foreground text-body")).toBe(
      "text-muted-foreground text-body",
    );
  });

  it("lets a later named text size replace an earlier size", () => {
    expect(cn("text-sm font-medium", "text-body")).toBe(
      "font-medium text-body",
    );
    expect(cn("text-body", "text-h1-lg")).toBe("text-h1-lg");
  });
});
