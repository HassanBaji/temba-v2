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

  it("lets the named card radius and a scale radius replace each other", () => {
    expect(cn("rounded-card", "rounded-lg")).toBe("rounded-lg");
    expect(cn("rounded-md", "rounded-card")).toBe("rounded-card");
    expect(cn("rounded-t-card", "rounded-t-sm")).toBe("rounded-t-sm");
  });

  it("lets the named container widths replace other max widths", () => {
    expect(cn("max-w-content", "max-w-md")).toBe("max-w-md");
    expect(cn("max-w-md", "max-w-wide")).toBe("max-w-wide");
    expect(cn("max-w-column", "max-w-content")).toBe("max-w-content");
  });
});
