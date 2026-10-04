/**
 * "Sofia Lindqvist" -> "Sofia L", so a two-name team label stays on one line.
 * Shared by the Games hub History card and the Group Played rows, which draw
 * the same seat names in the same width.
 */
export function shortPlayerName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const first = parts[0];
  if (!first) {
    return name;
  }
  if (parts.length === 1) {
    return first;
  }
  const surnameInitial = Array.from(parts[parts.length - 1]!)[0];
  return surnameInitial ? `${first} ${surnameInitial.toUpperCase()}` : first;
}
