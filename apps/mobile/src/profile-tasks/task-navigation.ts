import { router } from "expo-router";

import { COMPLETE_PROFILE_PATH } from "./profile-tasks-model";

/** A task returns to the checklist it came from, or opens it when deep-linked. */
export function backToChecklist() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(COMPLETE_PROFILE_PATH);
}

export function leaveChecklist() {
  router.replace("/");
}

/** The checklist's back arrow: where the User came from, or Home. */
export function exitChecklist() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  leaveChecklist();
}
