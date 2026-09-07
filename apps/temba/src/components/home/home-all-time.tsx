const FIGURES = [
  { key: "played", label: "Played" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

export function HomeAllTime({
  gamesPlayed,
  gamesWon,
  gamesLost,
}: {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
}) {
  const values = {
    played: gamesPlayed,
    won: gamesWon,
    lost: gamesLost,
  };

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <h2 className="text-muted-foreground text-meta px-[22px] pb-3 pt-[22px]">
        All time
      </h2>
      <div className="divide-rule border-rule flex divide-x border-t px-[22px] pb-[22px]">
        {FIGURES.map((figure) => (
          <div
            key={figure.key}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 px-3 first:pl-0 last:pr-0"
          >
            <p className="font-expanded text-[34px] tabular-nums leading-none">
              {values[figure.key]}
            </p>
            <p className="text-muted-foreground text-meta">{figure.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
