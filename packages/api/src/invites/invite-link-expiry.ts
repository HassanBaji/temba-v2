/** Invite link tokens expire 6 hours after mint. Check-on-read; no worker. */
export const INVITE_LINK_TTL_MS = 6 * 60 * 60 * 1000;

export function inviteLinkExpiresAt(from = new Date()) {
  return new Date(from.getTime() + INVITE_LINK_TTL_MS);
}

export function isInviteLinkLive(expiresAt: Date, now = new Date()) {
  return now.getTime() < expiresAt.getTime();
}
