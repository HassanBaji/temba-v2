import type { TournamentDetailRow } from "@repo/domain/tournament-details";

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
            index === 0 ? "px-5 py-4" : "border-rule border-t px-5 py-4"
          }
        >
          <div className="text-body flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-end">{row.value}</span>
          </div>
          {row.note ? (
            <p className="text-muted-foreground text-meta mt-1">{row.note}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
