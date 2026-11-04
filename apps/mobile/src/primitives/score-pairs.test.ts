import { describe, expect, it } from "vitest";

import { scorePairs } from "./score-pairs";

describe("scorePairs", () => {
  it("reads one score as one pair, own number first", () => {
    expect(scorePairs("6–3")).toEqual([{ own: "6", other: "3" }]);
  });

  it("reads every set of a multi-set score in order", () => {
    expect(scorePairs("6–4 4–6  10–8")).toEqual([
      { own: "6", other: "4" },
      { own: "4", other: "6" },
      { own: "10", other: "8" },
    ]);
  });

  it("leaves text that is not only scores alone", () => {
    expect(scorePairs("2–1 in sets")).toBeNull();
    expect(scorePairs("No score yet")).toBeNull();
    expect(scorePairs("90m")).toBeNull();
    expect(scorePairs("6-4")).toBeNull();
    expect(scorePairs("")).toBeNull();
  });
});
