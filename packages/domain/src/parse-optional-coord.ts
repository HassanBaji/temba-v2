export function parseOptionalCoord(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export function coordToInput(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return value;
}
