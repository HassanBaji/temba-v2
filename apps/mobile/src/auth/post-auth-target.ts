import type { Href } from "expo-router";

/**
 * Where the signed-out layout sends a User once Clerk reports a session. The
 * sign-up branch sets it right before `setActive` so a new account lands on
 * the Profile checklist instead of Home; everyone else goes to `/`.
 */
let target: Href | null = null;

export function setPostAuthTarget(href: Href) {
  target = href;
}

export function consumePostAuthTarget(): Href | null {
  const next = target;
  target = null;
  return next;
}

export const FRESH_ACCOUNT_TARGET: Href = "/complete-profile?fresh=1";
