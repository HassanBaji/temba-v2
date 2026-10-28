import { describe, expect, it } from "vitest";

import {
  COURT_SPORT_LABELS,
  courtCountLabel,
  courtFace,
} from "./court-sport-copy";

describe("court sport copy", () => {
  it("calls a football Court a pitch and a padel Court a court", () => {
    expect(courtFace("football")).toBe("pitch");
    expect(courtFace("padel")).toBe("court");
  });

  it("pluralises the face", () => {
    expect(courtCountLabel(1, "football")).toBe("1 pitch");
    expect(courtCountLabel(2, "football")).toBe("2 pitches");
    expect(courtCountLabel(1, "padel")).toBe("1 court");
    expect(courtCountLabel(3, "padel")).toBe("3 courts");
  });

  it("labels each sport", () => {
    expect(COURT_SPORT_LABELS.padel).toBe("Padel");
    expect(COURT_SPORT_LABELS.football).toBe("Football");
  });
});
