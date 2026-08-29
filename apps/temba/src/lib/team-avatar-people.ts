function peopleFromDisplayName(displayName: string, memberCount: number) {
  const parts = displayName
    .split(" & ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(0, memberCount).map((name) => ({ name }));
  }
  if (memberCount <= 1) {
    return [{ name: displayName }];
  }
  return Array.from({ length: memberCount }, () => ({ name: displayName }));
}

export function teamAvatarPeople(
  displayName: string,
  memberCount: number,
  incomplete: boolean,
) {
  const count = incomplete
    ? Math.max(memberCount, 1)
    : Math.max(memberCount, 2);
  return peopleFromDisplayName(displayName, count);
}
