import { describe, expect, it } from "vitest";

import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  displayLabelFromStoredBand,
  LEVEL_BANDS,
  nextDistinctDisplayRung,
  RESERVED_DISPLAY_LEVEL_BAND,
  SELF_DECLARE_CHOICES,
  selfDeclareChoiceFromDisplay,
  storedBandFromDisplayLabel,
} from "./level-bands";

describe("displayLabelFromStoredBand", () => {
  it("maps every stored band onto the assignable display ladder", () => {
    expect(
      LEVEL_BANDS.map((band) => [band, displayLabelFromStoredBand(band)]),
    ).toEqual([
      ["D3", "D"],
      ["D2", "D"],
      ["D1", "D+"],
      ["C3", "C"],
      ["C2", "C"],
      ["C1", "C+"],
      ["B3", "B"],
      ["B2", "B"],
      ["B1", "B+"],
      ["A", "A"],
    ]);
  });

  it("never produces PRO from a stored band", () => {
    for (const band of LEVEL_BANDS) {
      expect(displayLabelFromStoredBand(band)).not.toBe(
        RESERVED_DISPLAY_LEVEL_BAND,
      );
    }
    expect(ASSIGNABLE_DISPLAY_LEVEL_BANDS).not.toContain(
      RESERVED_DISPLAY_LEVEL_BAND,
    );
  });

  it("lists the seven assignable picker rungs in product order", () => {
    expect([...ASSIGNABLE_DISPLAY_LEVEL_BANDS]).toEqual([
      "D",
      "D+",
      "C",
      "C+",
      "B",
      "B+",
      "A",
    ]);
  });
});

describe("nextDistinctDisplayRung", () => {
  it("skips collapsed thirds that share the current display letter", () => {
    expect(nextDistinctDisplayRung("D3")).toBe("D+");
    expect(nextDistinctDisplayRung("D2")).toBe("D+");
    expect(nextDistinctDisplayRung("C3")).toBe("C+");
    expect(nextDistinctDisplayRung("C2")).toBe("C+");
    expect(nextDistinctDisplayRung("B1")).toBe("A");
    expect(nextDistinctDisplayRung("A")).toBeNull();
  });
});

describe("self-declare write-down", () => {
  it("maps assignable display rungs to the lower stored third", () => {
    expect(storedBandFromDisplayLabel("D")).toBe("D3");
    expect(storedBandFromDisplayLabel("D+")).toBe("D1");
    expect(storedBandFromDisplayLabel("C")).toBe("C3");
    expect(storedBandFromDisplayLabel("C+")).toBe("C1");
    expect(storedBandFromDisplayLabel("B")).toBe("B3");
    expect(storedBandFromDisplayLabel("B+")).toBe("B1");
    expect(storedBandFromDisplayLabel("A")).toBe("A");
  });

  it("maps unknown to the existing self-declare choice and display picks to stored bands", () => {
    expect(selfDeclareChoiceFromDisplay("unknown")).toBe("unknown");
    expect(selfDeclareChoiceFromDisplay("D")).toBe("D3");
    expect(selfDeclareChoiceFromDisplay("D+")).toBe("D1");
    expect(selfDeclareChoiceFromDisplay("C")).toBe("C3");
    expect(selfDeclareChoiceFromDisplay("C+")).toBe("C1");
    expect(selfDeclareChoiceFromDisplay("B")).toBe("B3");
    expect(selfDeclareChoiceFromDisplay("B+")).toBe("B1");
    expect(selfDeclareChoiceFromDisplay("A")).toBe("A");
  });

  it("still accepts stored D2 / C2 / B2 as self-declare API choices", () => {
    expect(SELF_DECLARE_CHOICES).toEqual([
      "D3",
      "D2",
      "D1",
      "C3",
      "C2",
      "C1",
      "B3",
      "B2",
      "B1",
      "A",
      "unknown",
    ]);
  });
});
