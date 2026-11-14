import { describe, expect, it } from "vitest";

import { isolate } from "./bidi";
import { ar } from "./messages/ar/index";
import { en } from "./messages/en/index";

type Leaf = string | ((...args: never[]) => string);
type Tree = { [key: string]: Leaf | Tree };

function leaves(tree: Tree, prefix = ""): Map<string, Leaf> {
  const found = new Map<string, Leaf>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" || typeof value === "function") {
      found.set(path, value);
    } else {
      for (const [innerPath, leaf] of leaves(value, path)) {
        found.set(innerPath, leaf);
      }
    }
  }
  return found;
}

const enLeaves = leaves(en as Tree);
const arLeaves = leaves(ar as Tree);

describe("message catalogs", () => {
  it("carry the same keys", () => {
    expect([...arLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
  });

  it("agree on which leaves take variables", () => {
    for (const [path, leaf] of enLeaves) {
      const other = arLeaves.get(path);
      expect(typeof other, path).toBe(typeof leaf);
      if (typeof leaf === "function" && typeof other === "function") {
        expect(other.length, path).toBe(leaf.length);
      }
    }
  });

  it("have no empty strings", () => {
    for (const [catalog, found] of [
      ["en", enLeaves],
      ["ar", arLeaves],
    ] as const) {
      for (const [path, leaf] of found) {
        if (typeof leaf === "string") {
          expect(leaf.trim(), `${catalog}.${path}`).not.toBe("");
        }
      }
    }
  });

  it("writes Arabic in the Arabic catalog", () => {
    const arabic = /[؀-ۿ]/;
    for (const [path, leaf] of arLeaves) {
      const latinWords = leaf.toString().match(/[A-Za-z]{3,}/g) ?? [];
      if (typeof leaf === "string" && latinWords.length >= 2) {
        expect(arabic.test(leaf), `ar.${path} reads "${leaf}"`).toBe(true);
      }
    }
  });

  it("keeps a Latin name apart from the record that follows it", () => {
    expect(ar.webUi.player.matchesSubtitle("Omar Aziz", "3 فوز، 2 خسارة")).toBe(
      `${isolate("Omar Aziz")}، 3 فوز، 2 خسارة`,
    );
    expect(en.webUi.player.matchesSubtitle("Omar Aziz", "3 won, 2 lost")).toBe(
      "Omar Aziz, 3 won, 2 lost",
    );
  });
});

describe("rating catalog counts", () => {
  const counts = [0, 1, 2, 5, 12, 1240] as const;
  const shown = (n: number) => (n === 1240 ? "1,240" : String(n));

  it("says one point and many points in English", () => {
    const t = en.rating;
    expect(counts.map((n) => t.tier.points(shown(n), n))).toEqual([
      "0 points",
      "1 point",
      "2 points",
      "5 points",
      "12 points",
      "1,240 points",
    ]);
    expect(t.tier.pointsSpoken("1", 1)).toBe("1 tier point");
    expect(t.tier.pointsSpoken("2", 2)).toBe("2 tier points");
    expect(t.tier.sharkFor("1", 1, 1)).toBe("1 point, a Shark for 1 week");
    expect(t.tier.sharkFor("1,240", 1240, 3)).toBe(
      "1,240 points, a Shark for 3 weeks",
    );
    expect(t.history.deltaSpoken("+1", 1)).toBe("+1 point");
    expect(t.history.deltaSpoken("−1", 1)).toBe("−1 point");
    expect(t.history.deltaSpoken("0", 0)).toBe("0 points");
    expect(t.history.deltaSpoken("+12", 12)).toBe("+12 points");
    const closed = t.performance.result;
    expect(closed.tier.toNext("1", 1, "Hamour")).toBe("1 point to Hamour.");
    expect(closed.tier.toNext("2", 2, "Hamour")).toBe("2 points to Hamour.");
    expect(closed.points.spoken("The result", "+1", 1)).toBe(
      "The result, +1 point",
    );
    expect(closed.points.spoken("The result", "−8", 8)).toBe(
      "The result, −8 points",
    );
    expect(t.performance.summary.row.pointsSpoken("+1", 1)).toBe("+1 point");
    expect(t.performance.summary.row.pointsSpoken("0", 0)).toBe("0 points");
  });

  it("counts games, matches, ratings and raters in English", () => {
    const t = en.rating;
    expect(t.tier.provisionalGames(0, 1)).toBe("Provisional, 0 of 1 game");
    expect(t.tier.provisionalGames(2, 5)).toBe("Provisional, 2 of 5 games");
    expect(t.adjust.nowProvisional(1, 5)).toBe("provisional, 1 of 5 games");
    expect(t.screen.level.confirmCount(1, 1)).toBe("1 of 1 match");
    expect(t.screen.level.confirmCount(1, 5)).toBe("1 of 5 matches");
    expect(t.ovrImpact.noRating(1)).toBe(
      "Fewer than 1 rating this time, so this part is 0",
    );
    expect(t.ovrImpact.noRating(2)).toBe(
      "Fewer than 2 ratings this time, so this part is 0",
    );
    const privacy = t.performance.everyone.privacy;
    expect(privacy(0, 9)).toContain("0 of 9 have rated so far");
    expect(privacy(1, 9)).toContain("1 of 9 has rated so far");
    expect(privacy(2, 9)).toContain("2 of 9 have rated so far");
  });

  it("supplies every Arabic form for points", () => {
    const t = ar.rating;
    const points = (n: number) => isolate(shown(n));
    expect(counts.map((n) => t.tier.points(shown(n), n))).toEqual([
      `${points(0)} نقاط`,
      "نقطة واحدة",
      "نقطتان",
      `${points(5)} نقاط`,
      `${points(12)} نقطة`,
      `${points(1240)} نقطة`,
    ]);
    expect(counts.map((n) => t.tier.pointsSpoken(shown(n), n))).toEqual([
      `${points(0)} نقاط فئة`,
      "نقطة فئة واحدة",
      "نقطتا فئة",
      `${points(5)} نقاط فئة`,
      `${points(12)} نقطة فئة`,
      `${points(1240)} نقطة فئة`,
    ]);
    expect(t.performance.result.tier.toNext("1", 1, "هامور")).toBe(
      "نقطة واحدة إلى هامور.",
    );
    expect(t.tier.sharkFor("2", 2, 2)).toBe("نقطتان، قرش منذ أسبوعين");
  });

  it("keeps the sign on an Arabic points move", () => {
    const moved = ar.rating.history.deltaSpoken;
    expect(
      [0, 1, 2, 5, 12, 100].map((n) => moved(n === 0 ? "0" : `+${n}`, n)),
    ).toEqual([
      `${isolate("0")} نقاط`,
      `${isolate("+1")} نقطة`,
      `${isolate("+2")} نقطتان`,
      `${isolate("+5")} نقاط`,
      `${isolate("+12")} نقطة`,
      `${isolate("+100")} نقطة`,
    ]);
    expect(ar.rating.performance.summary.row.pointsSpoken("−3", 3)).toBe(
      `${isolate("−3")} نقاط`,
    );
  });

  it("counts Arabic games, matches and ratings by the total", () => {
    const t = ar.rating;
    expect(
      [1, 2, 5, 11, 100].map((of) => t.tier.provisionalGames(0, of)),
    ).toEqual([
      "مبدئي، 0 من مباراة واحدة",
      "مبدئي، 0 من مباراتين",
      "مبدئي، 0 من 5 مباريات",
      "مبدئي، 0 من 11 مباراة",
      "مبدئي، 0 من 100 مباراة",
    ]);
    expect(t.adjust.nowProvisional(3, 5)).toBe("مبدئي، 3 من 5 مباريات");
    expect(t.screen.level.confirmCount(3, 5)).toBe("3 من 5 مباريات");
    expect(t.screen.level.confirmCount(1, 2)).toBe("1 من مباراتين");
    expect([1, 2, 3, 11].map((min) => t.ovrImpact.noRating(min))).toEqual([
      "أقل من تقييم واحد هذه المرة، لذا هذا الجزء صفر",
      "أقل من تقييمين هذه المرة، لذا هذا الجزء صفر",
      "أقل من 3 تقييمات هذه المرة، لذا هذا الجزء صفر",
      "أقل من 11 تقييمًا هذه المرة، لذا هذا الجزء صفر",
    ]);
  });
});
