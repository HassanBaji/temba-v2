export type FootballInfoRow = { label: string; value: string };

/** Label and value lines on one card, split by hairlines. */
export function FootballInfoRows({
  rows,
}: {
  rows: readonly FootballInfoRow[];
}) {
  return (
    <dl className="border-rule bg-paper divide-rule divide-y overflow-hidden rounded-xl border">
      {rows.map((row) => (
        <div
          key={row.label}
          className="text-body flex justify-between gap-4 px-5 py-3.5"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="text-right">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
