export function communityEmailInvitePath(token: string) {
  return `/invites/community/email/${token}`;
}

export function communityInviteLinkPath(token: string) {
  return `/invites/community/link/${token}`;
}

export function groupEmailInvitePath(token: string) {
  return `/invites/group/email/${token}`;
}

export function groupInviteLinkPath(token: string) {
  return `/invites/group/link/${token}`;
}

export function teamEmailInvitePath(token: string) {
  return `/invites/team/email/${token}`;
}

export function teamInviteLinkPath(token: string) {
  return `/invites/team/link/${token}`;
}

export function gameInviteLinkPath(token: string) {
  return `/invites/game/link/${token}`;
}
