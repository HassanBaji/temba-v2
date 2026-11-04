import { describe, expect, it } from "vitest";

import { courtCountLabel, courtFace } from "./court-sport-copy";

describe("court sport copy", () => {
  it("calls a football Court a pitch and a padel Court a court", () => {
    expect(courtFace("football")).toBe("pitch");
    expect(courtFace("padel")).toBe("court");
  });

  it("pluralises the face", () => {
    expect(courtCountLabel(1, "football", "en")).toBe("1 pitch");
    expect(courtCountLabel(2, "football", "en")).toBe("2 pitches");
    expect(courtCountLabel(1, "padel", "en")).toBe("1 court");
    expect(courtCountLabel(3, "padel", "en")).toBe("3 courts");
  });

  it("counts courts in Arabic", () => {
    expect(courtCountLabel(2, "padel", "ar")).toBe("ملعبان");
    expect(courtCountLabel(3, "football", "ar")).toBe("3 ملاعب");
  });
});
