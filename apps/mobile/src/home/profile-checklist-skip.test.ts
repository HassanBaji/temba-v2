import { describe, expect, it } from "vitest";

import {
  PROFILE_CHECKLIST_SKIPPED_KEY,
  readChecklistSkipped,
  writeChecklistSkipped,
  type ChecklistSkipStorage,
} from "./profile-checklist-skip";

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: ChecklistSkipStorage = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
    removeItem: async (key) => {
      items.delete(key);
    },
  };
  return { storage, items };
}

describe("profile checklist skip", () => {
  it("is not skipped by default", async () => {
    expect(await readChecklistSkipped(memoryStorage().storage)).toBe(false);
  });

  it("round-trips a skip and its undo", async () => {
    const { storage, items } = memoryStorage();
    await writeChecklistSkipped(storage, true);
    expect(items.get(PROFILE_CHECKLIST_SKIPPED_KEY)).toBe("1");
    expect(await readChecklistSkipped(storage)).toBe(true);
    await writeChecklistSkipped(storage, false);
    expect(await readChecklistSkipped(storage)).toBe(false);
  });

  it("swallows storage failures", async () => {
    const broken: ChecklistSkipStorage = {
      getItem: () => Promise.reject(new Error("no disk")),
      setItem: () => Promise.reject(new Error("no disk")),
      removeItem: () => Promise.reject(new Error("no disk")),
    };
    expect(await readChecklistSkipped(broken)).toBe(false);
    await expect(writeChecklistSkipped(broken, true)).resolves.toBeUndefined();
  });
});
