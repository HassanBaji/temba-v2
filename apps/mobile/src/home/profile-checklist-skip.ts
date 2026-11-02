export const PROFILE_CHECKLIST_SKIPPED_KEY = "temba.profileChecklist.skipped";

export type ChecklistSkipStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export async function readChecklistSkipped(
  storage: ChecklistSkipStorage,
): Promise<boolean> {
  try {
    return (await storage.getItem(PROFILE_CHECKLIST_SKIPPED_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function writeChecklistSkipped(
  storage: ChecklistSkipStorage,
  skipped: boolean,
): Promise<void> {
  try {
    if (skipped) {
      await storage.setItem(PROFILE_CHECKLIST_SKIPPED_KEY, "1");
    } else {
      await storage.removeItem(PROFILE_CHECKLIST_SKIPPED_KEY);
    }
  } catch {
    // Skipping is a convenience; the card still works without storage.
  }
}
