import Link from "next/link";

import { ResultMark } from "~/components/temba/result-mark";
import type { PlayerMatchRowView } from "@repo/domain/player-profile-matches";
import { cn } from "~/lib/utils";

function RowContent({ row }: { row: PlayerMatchRowView }) {
  return (
    <>
      <ResultMark variant={row.outcome} decorative className="size-5" />
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="text-body block truncate font-semibold">
          {row.opponents}
        </span>
        <span className="text-meta text-muted-foreground block truncate">
          {row.meta}
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-right tabular-nums">
        <span className="text-body flex gap-2 font-semibold">
          {row.sets.map((set, index) => (
            <span key={index}>{set}</span>
          ))}
        </span>
        {row.delta ? (
          <span className="text-meta text-muted-foreground block">
            {row.delta}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{row.accessibilityLabel}</span>
    </>
  );
}

const ROW = "flex min-h-11 items-center gap-3 px-5 py-3.5";

export function PlayerMatchRow({
  row,
  href,
}: {
  row: PlayerMatchRowView;
  href?: string;
}) {
  if (!href) {
    return (
      <div className={ROW}>
        <RowContent row={row} />
      </div>
    );
  }
  return (
    <Link href={href} className={cn(ROW, "hover:bg-wash transition-colors")}>
      <RowContent row={row} />
    </Link>
  );
}
