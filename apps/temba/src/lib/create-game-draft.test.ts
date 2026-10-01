import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { friendlyTournamentDefaultName } from "./create-game-flow";
import {
  clearCreateGameDrafts,
  createGameDraftStorageKey,
  initialCreateGameDraft,
  isCreateGameDraftDirty,
  parseCreateGameDraft,
  readCreateGameDraft,
  serializeCreateGameDraft,
  writeCreateGameDraft,
  type CreateGameDraft,
} from "./create-game-draft";

const now = new Date(2026, 8, 29, 10, 0);

function filledDraft(): CreateGameDraft {
  return {
    ...initialCreateGameDraft(now),
    groupId: "group-1",
    venueId: "venue-1",
    courtId: "court-2",
    courtIds: ["court-1", "court-2"],
    day: "2026-10-31",
    startTime: "18:30",
    finishTime: "20:00",
    pricePerPlayer: "12.50",
    levelMin: "C3",
    levelMax: "B+",
    preferLevelRange: true,
    teamCount: 12,
    poolCount: 3,
    roundCount: 2,
    matchMinutes: "30",
    name: "Halloween cup",
    nameTouched: true,
    isPublic: true,
    allowSoloRegister: false,
  };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("create game draft", () => {
  it("starts from the earliest create day with a matching default tournament name", () => {
    const initial = initialCreateGameDraft(now);
    assert.equal(initial.day, "2026-09-29");
    assert.equal(initial.name, friendlyTournamentDefaultName("2026-09-29"));
    assert.equal(initial.courtId, "none");
    assert.equal(initial.roundCount, null);
  });

  it("round-trips every field", () => {
    const draft = filledDraft();
    assert.deepEqual(
      parseCreateGameDraft(serializeCreateGameDraft(draft)),
      draft,
    );
  });

  it("round-trips the Tournament shape and reads an older draft as Groups only", () => {
    const draft = {
      ...filledDraft(),
      tournamentShape: "knockout_only" as const,
    };
    assert.deepEqual(
      parseCreateGameDraft(serializeCreateGameDraft(draft)),
      draft,
    );
    assert.equal(initialCreateGameDraft(now).tournamentShape, "groups_only");
    const stored = JSON.parse(
      serializeCreateGameDraft(filledDraft()),
    ) as Record<string, unknown>;
    delete stored.tournamentShape;
    assert.equal(
      parseCreateGameDraft(JSON.stringify(stored))?.tournamentShape,
      "groups_only",
    );
    assert.equal(
      parseCreateGameDraft(
        JSON.stringify({ ...stored, tournamentShape: "groups_then_knockout" }),
      ),
      null,
    );
  });

  it("keeps the calendar day across month and year boundaries", () => {
    for (const day of ["2026-12-31", "2027-01-01", "2028-02-29"]) {
      const draft = { ...filledDraft(), day };
      assert.equal(
        parseCreateGameDraft(serializeCreateGameDraft(draft))?.day,
        day,
      );
    }
  });

  it("rejects missing, malformed or outdated drafts", () => {
    assert.equal(parseCreateGameDraft(null), null);
    assert.equal(parseCreateGameDraft(""), null);
    assert.equal(parseCreateGameDraft("{"), null);
    assert.equal(parseCreateGameDraft("[]"), null);
    const stored = JSON.parse(
      serializeCreateGameDraft(filledDraft()),
    ) as Record<string, unknown>;
    for (const broken of [
      { ...stored, version: 0 },
      { ...stored, day: "2026-02-30" },
      { ...stored, day: 20261031 },
      { ...stored, levelMin: "Z9" },
      { ...stored, teamCount: "12" },
      { ...stored, roundCount: 0 },
      { ...stored, courtIds: [1] },
      { ...stored, isPublic: "yes" },
    ]) {
      assert.equal(parseCreateGameDraft(JSON.stringify(broken)), null);
    }
  });

  it("is dirty only when a field differs from the initial draft", () => {
    const initial = initialCreateGameDraft(now);
    assert.equal(
      isCreateGameDraftDirty(initialCreateGameDraft(now), initial),
      false,
    );
    assert.equal(
      isCreateGameDraftDirty({ ...initial, startTime: "18:00" }, initial),
      true,
    );
    assert.equal(
      isCreateGameDraftDirty({ ...initial, courtIds: ["court-1"] }, initial),
      true,
    );
  });

  it("stores drafts per create type and clears all of them", () => {
    const storage = memoryStorage();
    const draft = filledDraft();
    writeCreateGameDraft(
      storage,
      "friendly_tournament",
      serializeCreateGameDraft(draft),
    );
    assert.deepEqual(
      readCreateGameDraft(storage, "friendly_tournament"),
      draft,
    );
    assert.equal(readCreateGameDraft(storage, "friendly_game"), null);
    assert.ok(
      storage.values.has(createGameDraftStorageKey("friendly_tournament")),
    );

    writeCreateGameDraft(
      storage,
      "friendly_game",
      serializeCreateGameDraft(draft),
    );
    clearCreateGameDrafts(storage);
    assert.equal(storage.values.size, 0);
  });

  it("removes a stored draft when written as null", () => {
    const storage = memoryStorage();
    writeCreateGameDraft(
      storage,
      "friendly_game",
      serializeCreateGameDraft(filledDraft()),
    );
    writeCreateGameDraft(storage, "friendly_game", null);
    assert.equal(readCreateGameDraft(storage, "friendly_game"), null);
  });

  it("never throws when storage is missing or blocked", () => {
    const serialized = serializeCreateGameDraft(filledDraft());
    assert.equal(readCreateGameDraft(null, "friendly_game"), null);
    assert.equal(readCreateGameDraft(throwingStorage, "friendly_game"), null);
    assert.doesNotThrow(() => {
      writeCreateGameDraft(null, "friendly_game", serialized);
      writeCreateGameDraft(throwingStorage, "friendly_game", serialized);
      writeCreateGameDraft(throwingStorage, "friendly_game", null);
      clearCreateGameDrafts(throwingStorage);
    });
  });
});
