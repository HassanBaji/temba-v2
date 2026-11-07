import {
  playedWordLabel,
  type PlayedPadelBoardRow,
} from "@repo/domain/played-game";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

function PairRow({ row }: { row: PlayedPadelBoardRow }) {
  const locale = useLocale();
  const m = useMessages();
  const word = playedWordLabel(row.word, locale);
  return (
    <div
      className="flex items-center justify-between gap-4"
      aria-label={m.webGame.played.pairRowLabel(
        row.line,
        word,
        row.sets.map((set) => set.value).join(m.tournament.listSeparator),
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-semibold",
            row.won ? "text-on-focus" : "text-dim",
          )}
        >
          {row.line}
        </p>
        <p className="text-dim text-meta">{word}</p>
      </div>
      <div className="flex gap-3.5">
        {row.sets.map((set) => (
          <span
            key={set.id}
            className={cn(
              "font-expanded w-[34px] text-center text-[44px] tabular-nums leading-[0.94]",
              set.won ? "text-on-focus" : "text-muted-foreground",
            )}
          >
            {set.value}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Sets won read across; the side that took each Set is full ink. */
export function PlayedPadelBoard({
  setLabels,
  rows,
}: {
  setLabels: string[];
  rows: [PlayedPadelBoardRow, PlayedPadelBoardRow];
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-end gap-3.5" aria-hidden="true">
        {setLabels.map((label) => (
          <span
            key={label}
            className="text-muted-foreground w-[34px] text-center font-mono text-[10px] tracking-[0.08em]"
          >
            {label}
          </span>
        ))}
      </div>
      <PairRow row={rows[0]} />
      <div className="bg-dimrule h-px" />
      <PairRow row={rows[1]} />
    </div>
  );
}
