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
