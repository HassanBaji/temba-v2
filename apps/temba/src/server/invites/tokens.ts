import { randomBytes } from "node:crypto";

import {
  communityInviteLinkPath,
  gameInviteLinkPath,
  gameInviteShortPath,
  groupInviteLinkPath,
  teamInviteLinkPath,
} from "~/lib/invite-paths";

/** Crockford-style alphabet; no 0/O/1/I/L/U. */
export const GAME_INVITE_SHORT_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

const GAME_INVITE_SHORT_CODE_LENGTH = 8;

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function createGameInviteShortCode() {
  const bytes = randomBytes(GAME_INVITE_SHORT_CODE_LENGTH);
  let code = "";
  for (const byte of bytes) {
    const index = byte % GAME_INVITE_SHORT_CODE_ALPHABET.length;
    const character = GAME_INVITE_SHORT_CODE_ALPHABET.charAt(index);
    code += character;
  }
  return code;
}

export function parseGameInviteShortCode(raw: string) {
  const code = raw.trim().toUpperCase();
  if (code.length !== GAME_INVITE_SHORT_CODE_LENGTH) {
    return null;
  }
  for (const character of code) {
    if (!GAME_INVITE_SHORT_CODE_ALPHABET.includes(character)) {
      return null;
    }
  }
  return code;
}

export function getAppOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function communityInviteLinkUrl(origin: string, token: string) {
  return `${origin}${communityInviteLinkPath(token)}`;
}

export function groupInviteLinkUrl(origin: string, token: string) {
  return `${origin}${groupInviteLinkPath(token)}`;
}

export function teamInviteLinkUrl(origin: string, token: string) {
  return `${origin}${teamInviteLinkPath(token)}`;
}

export function gameInviteLinkUrl(origin: string, token: string) {
  return `${origin}${gameInviteLinkPath(token)}`;
}

export function gameInviteShortUrl(origin: string, code: string) {
  return `${origin}${gameInviteShortPath(code)}`;
}

export function preferredGameInviteUrl(
  origin: string,
  link: { token: string; shortCode?: string | null },
) {
  if (link.shortCode) {
    return gameInviteShortUrl(origin, link.shortCode);
  }
  return gameInviteLinkUrl(origin, link.token);
}

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export {
  communityInviteLinkPath,
  gameInviteLinkPath,
  gameInviteShortPath,
  groupInviteLinkPath,
  teamInviteLinkPath,
};
