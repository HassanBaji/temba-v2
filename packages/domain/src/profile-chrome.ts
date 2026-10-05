export function profileSettingsAriaLabel(pendingInviteCount: number) {
  return pendingInviteCount > 0
    ? `Settings, ${pendingInviteCount} pending invites`
    : "Settings";
}
