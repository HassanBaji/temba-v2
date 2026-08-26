export function communityEmailInvitePath(token: string) {
  return `/invites/community/email/${token}`;
}

export function communityInviteLinkPath(token: string) {
  return `/invites/community/link/${token}`;
}
