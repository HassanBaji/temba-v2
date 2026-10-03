export type TournamentDetailRow = {
  label: string;
  value: string;
};

export function TournamentDetailRows({
  rows,
}: {
  rows: TournamentDetailRow[];
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="border-rule rounded-card overflow-hidden border">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${row.value}`}
          className={
            index === 0
              ? "text-body flex items-baseline justify-between gap-3 px-5 py-4"
              : "border-rule text-body flex items-baseline justify-between gap-3 border-t px-5 py-4"
          }
        >
          <span className="text-muted-foreground">{row.label}</span>
          <span className="text-right">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
