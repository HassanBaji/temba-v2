import { describe, expect, it } from "vitest";

import { gameRegistrationStatusClasses } from "~/components/temba/typed-labels";

describe("gameRegistrationStatusClasses", () => {
  it.each([
    ["open", "text-success", "bg-success"],
    ["full", "text-warning", "bg-warning"],
    ["closed", "text-muted-foreground", "bg-muted-foreground"],
    ["frozen", "text-warning", "bg-warning"],
    ["cancelled", "text-destructive", "bg-destructive"],
  ])("paints %s with static text and dot classes", (status, text, dot) => {
    expect(gameRegistrationStatusClasses(status)).toEqual({ text, dot });
  });

  it("falls back to muted text for an unknown status, never a background", () => {
    const classes = gameRegistrationStatusClasses("paused");
    expect(classes.text).toBe("text-muted-foreground");
    expect(classes.text).not.toMatch(/\bbg-/);
    expect(classes.dot).toBe("bg-current");
  });

  it("does not treat inherited object keys as statuses", () => {
    expect(gameRegistrationStatusClasses("constructor").text).toBe(
      "text-muted-foreground",
    );
  });
});
