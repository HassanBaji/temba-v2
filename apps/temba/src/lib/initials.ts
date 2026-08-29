const FALLBACK_INITIALS = "?";

function firstGrapheme(value: string): string | undefined {
  return Array.from(value)[0];
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return FALLBACK_INITIALS;
  }

  const first = firstGrapheme(parts[0]!);
  if (!first) {
    return FALLBACK_INITIALS;
  }

  if (parts.length === 1) {
    return first.toUpperCase();
  }

  const last = firstGrapheme(parts[parts.length - 1]!);
  if (!last) {
    return first.toUpperCase();
  }

  return `${first}${last}`.toUpperCase();
}
