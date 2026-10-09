export function gridRows<T>(
  items: readonly T[],
  columns: number,
): (T | null)[][] {
  const width = Math.max(1, Math.floor(columns));
  const rows: (T | null)[][] = [];
  for (let start = 0; start < items.length; start += width) {
    const row: (T | null)[] = items.slice(start, start + width);
    while (row.length < width) {
      row.push(null);
    }
    rows.push(row);
  }
  return rows;
}
