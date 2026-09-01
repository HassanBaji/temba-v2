export function teamDisplayName(name: string | null, memberNames: string[]) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (memberNames.length === 0) {
    return "Untitled Team";
  }
  return memberNames.join(" & ");
}
