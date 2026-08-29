import Link from "next/link";

import { ListRow } from "~/components/common/row-list";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { GameFormatBadge } from "~/components/temba/typed-labels";
import { formatGameStart, formatRelativeDay } from "~/lib/format-game-start";

export function GameSummaryCard({
  name,
  startTime,
  groupName,
  sport,
  href,
  format,
  cancelled = false,
}: {
  name: string | null;
  startTime: Date | string;
  groupName?: string | null;
  sport?: string | null;
  href?: string;
  format?: string | null;
  cancelled?: boolean;
}) {
  const title = name ?? "Untitled Game";
  const meta = [
    formatRelativeDay(startTime),
    formatGameStart(startTime),
    groupName ?? "Pickup",
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  const trailing = (
    <div className="flex flex-wrap items-center gap-2">
      {format ? <GameFormatBadge format={format} /> : null}
      {sport ? <SportBadge sport={sport} /> : null}
      {cancelled ? <GameStatusBadge status="cancelled" /> : null}
    </div>
  );

  if (href) {
    return (
      <ListRow asChild title={title} meta={meta} trailing={trailing}>
        <Link href={href} />
      </ListRow>
    );
  }

  return <ListRow title={title} meta={meta} trailing={trailing} />;
}
