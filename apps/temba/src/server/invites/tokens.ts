import { randomBytes } from "node:crypto";

import {
  communityEmailInvitePath,
  communityInviteLinkPath,
  groupEmailInvitePath,
  groupInviteLinkPath,
  teamEmailInvitePath,
  teamInviteLinkPath,
  gameInviteLinkPath,
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

export function groupEmailInviteUrl(origin: string, token: string) {
  return `${origin}${groupEmailInvitePath(token)}`;
}

export function groupInviteLinkUrl(origin: string, token: string) {
  return `${origin}${groupInviteLinkPath(token)}`;
}

export function teamEmailInviteUrl(origin: string, token: string) {
  return `${origin}${teamEmailInvitePath(token)}`;
}

export function teamInviteLinkUrl(origin: string, token: string) {
  return `${origin}${teamInviteLinkPath(token)}`;
}

export function gameInviteLinkUrl(origin: string, token: string) {
  return `${origin}${gameInviteLinkPath(token)}`;
}

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export {
  communityEmailInvitePath,
  communityInviteLinkPath,
  groupEmailInvitePath,
  groupInviteLinkPath,
  teamEmailInvitePath,
  teamInviteLinkPath,
  gameInviteLinkPath,
};
