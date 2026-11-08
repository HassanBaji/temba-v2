import { describe, expect, it } from "vitest";

import { challengeMineSections } from "./challenge-mine";

describe("challengeMineSections", () => {
  it("keeps waiting on you first, then posted, pending, accepted and played, with one focus", () => {
    const sections = challengeMineSections(
      [
        { kind: "played", key: "p1" },
        { kind: "waiting", key: "w1" },
        { kind: "waiting", key: "w2" },
        { kind: "accepted", key: "a1" },
        { kind: "pending", key: "s1" },
        { kind: "posted", key: "c1" },
      ] as const,
      "en",
    );
    expect(sections.map((section) => section.title)).toEqual([
      "Waiting on you",
      "Your challenges",
      "Your proposals",
      "Accepted",
      "Played",
    ]);
    expect(
      sections.flatMap((section) =>
        section.items.map((entry) => [entry.item.key, entry.focus]),
      ),
    ).toEqual([
      ["w1", true],
      ["w2", false],
      ["c1", false],
      ["s1", false],
      ["a1", false],
      ["p1", false],
    ]);
  });

  it("drops empty sections", () => {
    expect(
      challengeMineSections([{ kind: "posted" as const }], "ar").map(
        (section) => section.kind,
      ),
    ).toEqual(["posted"]);
  });
});
