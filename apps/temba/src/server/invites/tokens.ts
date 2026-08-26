import { randomBytes } from "node:crypto";

import {
  communityEmailInvitePath,
  communityInviteLinkPath,
} from "~/lib/invite-paths";

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function getAppOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function communityEmailInviteUrl(origin: string, token: string) {
  return `${origin}${communityEmailInvitePath(token)}`;
}

export function communityInviteLinkUrl(origin: string, token: string) {
  return `${origin}${communityInviteLinkPath(token)}`;
}

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export { communityEmailInvitePath, communityInviteLinkPath };
