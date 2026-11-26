import type { Href } from "expo-router";

import { setPostAuthTarget } from "../auth/post-auth-target";

/**
 * The App screen a link from outside the App last opened. A signed-out User is
 * sent to sign in first, so the link is kept for after; a signed-in User
 * already landed on it, so it is dropped.
 */
let pending: Href | null = null;

export function holdAppLink(href: Href) {
  pending = href;
}

export function settleAppLink(signedIn: boolean) {
  if (pending && !signedIn) {
    setPostAuthTarget(pending);
  }
  pending = null;
}
