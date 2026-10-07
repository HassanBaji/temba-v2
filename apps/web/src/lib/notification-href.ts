export function notificationHref(item: {
  type: string;
  group: { id: string } | null;
}): string | null {
  if (item.type === "group_member_joined" && item.group) {
    return `/dashboard/groups/${item.group.id}`;
  }
  return null;
}
