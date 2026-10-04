export function coordToDecimal(
  value: number | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}
