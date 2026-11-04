import { describe, expect, it } from "vitest";

import { isolate } from "./bidi";

describe("isolate", () => {
  it("wraps the text in first-strong and pop isolate marks", () => {
    expect(isolate("C+")).toBe("⁨C+⁩");
  });
});
