export function communityInviteLinkPath(token: string) {
  return `/invites/community/link/${token}`;
}

export function groupInviteLinkPath(token: string) {
  return `/invites/group/link/${token}`;
}

export function teamInviteLinkPath(token: string) {
  return `/invites/team/link/${token}`;
}

export function gameInviteLinkPath(token: string) {
  return `/invites/game/link/${token}`;
}

export function gameInviteShortPath(code: string) {
  return `/g/${code}`;
}
