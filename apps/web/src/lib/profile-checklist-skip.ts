const SKIPPED_KEY = "temba.profile-checklist.skipped";

/** Private mode or blocked site data can make even reading the property throw. */
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Whether this device chose Skip for now on the Home checklist card. */
export function readChecklistSkipped(): boolean {
  try {
    return storage()?.getItem(SKIPPED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeChecklistSkipped(skipped: boolean) {
  try {
    const store = storage();
    if (!store) {
      return;
    }
    if (skipped) {
      store.setItem(SKIPPED_KEY, "1");
    } else {
      store.removeItem(SKIPPED_KEY);
    }
  } catch {
    // The card still collapses for this render; it just will not remember.
  }
}
