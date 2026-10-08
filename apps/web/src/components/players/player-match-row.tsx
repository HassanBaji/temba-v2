import Link from "next/link";

import { ResultMark } from "~/components/temba/result-mark";
import type { PlayerMatchRowView } from "@repo/domain/player-profile-matches";
import { cn } from "~/lib/utils";

function RowContent({
  row,
  showPartner,
}: {
  row: PlayerMatchRowView;
  showPartner: boolean;
}) {
  return (
    <>
      <ResultMark variant={row.outcome} decorative className="size-5" />
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="text-body block truncate font-semibold">
          {row.opponents}
        </span>
        {showPartner ? (
          <span className="text-meta block truncate">{row.partnerVenue}</span>
        ) : null}
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
  onSelect,
  selected = false,
  showPartner = false,
}: {
  row: PlayerMatchRowView;
  href?: string;
  onSelect?: () => void;
  selected?: boolean;
  showPartner?: boolean;
}) {
  const content = <RowContent row={row} showPartner={showPartner} />;
  const interactive = cn(
    ROW,
    "hover:bg-wash w-full text-left transition-colors",
    selected && "bg-wash",
  );
  if (onSelect) {
    return (
      <button
        type="button"
        aria-current={selected || undefined}
        onClick={onSelect}
        className={interactive}
      >
        {content}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} className={interactive}>
        {content}
      </Link>
    );
  }
  return <div className={ROW}>{content}</div>;
}
