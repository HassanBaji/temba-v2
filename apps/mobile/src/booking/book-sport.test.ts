import { describe, expect, it } from "vitest";

import {
  BOOK_SPORT_STORAGE_KEY,
  bookTitle,
  courtCoachCopy,
  courtNounTitle,
  courtStepTitle,
  readBookSport,
  sportFromParam,
  sportQuery,
  writeBookSport,
  type BookSportStorage,
} from "./book-sport";
import { checkoutPath, venuePath } from "./booking-model";

function memoryStorage(): BookSportStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
}

const throwingStorage: BookSportStorage = {
  getItem: async () => {
    throw new Error("storage unavailable");
  },
  setItem: async () => {
    throw new Error("storage unavailable");
  },
};

describe("Book tab sport choice", () => {
  it("defaults to padel and survives a restart", async () => {
    const storage = memoryStorage();
    expect(await readBookSport(storage)).toBe("padel");
    await writeBookSport(storage, "football");
    expect(storage.values.get(BOOK_SPORT_STORAGE_KEY)).toBe("football");
    expect(await readBookSport(storage)).toBe("football");
  });

  it("falls back to padel for an unknown stored value", async () => {
    const storage = memoryStorage();
    storage.values.set(BOOK_SPORT_STORAGE_KEY, "rugby");
    expect(await readBookSport(storage)).toBe("padel");
  });

  it("works when storage throws", async () => {
    expect(await readBookSport(throwingStorage)).toBe("padel");
    await expect(writeBookSport(throwingStorage, "football")).resolves.toBe(
      undefined,
    );
  });
});

describe("pitch copy", () => {
  it("says pitch for football and court for padel", () => {
    expect(bookTitle("football")).toBe("Book a pitch");
    expect(bookTitle("padel")).toBe("Book a court");
    expect(courtStepTitle("football")).toBe("Pick a pitch");
    expect(courtStepTitle("padel")).toBe("Court");
    expect(courtNounTitle("football")).toBe("Pitch");
    expect(courtCoachCopy("football")).toBe(
      "Pick a start time to see which pitches are free.",
    );
    expect(courtCoachCopy("padel")).toBe(
      "Pick a start time to see which courts are free.",
    );
  });
});

describe("sport in routes", () => {
  it("only football travels in the route", () => {
    expect(sportQuery("padel")).toBe("");
    expect(venuePath("v1")).toBe("/book/venues/v1");
    expect(venuePath("v1", "football")).toBe("/book/venues/v1?sport=football");
    expect(checkoutPath("v1", new Date(0), 60, "c1")).not.toContain("sport");
    expect(checkoutPath("v1", new Date(0), 60, "c1", "football")).toMatch(
      /&sport=football$/,
    );
    expect(sportFromParam("football")).toBe("football");
    expect(sportFromParam(undefined)).toBe("padel");
    expect(sportFromParam("nonsense")).toBe("padel");
  });
});
