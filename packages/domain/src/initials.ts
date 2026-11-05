import { nameInitial } from "./player-name";

const FALLBACK_INITIALS = "?";

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return FALLBACK_INITIALS;
  }

  const first = nameInitial(parts[0]!);
  if (!first) {
    return FALLBACK_INITIALS;
  }

  if (parts.length === 1) {
    return first.toUpperCase();
  }

  const last = nameInitial(parts[parts.length - 1]!);
  if (!last) {
    return first.toUpperCase();
  }

  return `${first}${last}`.toUpperCase();
}
