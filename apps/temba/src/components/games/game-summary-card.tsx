import Link from "next/link";

import { ListRow } from "~/components/common/row-list";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import {
  formatGameStart,
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";

export function GameSummaryCard({
  name,
  startTime,
  groupName,
  sport,
  href,
  cancelled = false,
  venueName,
  location,
  occupancy,
  windowStart,
  windowEnd,
  actionLabel,
}: {
  name: string | null;
  startTime: Date | string;
  groupName?: string | null;
  sport?: string | null;
  href?: string;
  cancelled?: boolean;
  venueName?: string | null;
  location?: string | null;
  occupancy?: string | null;
  windowStart?: Date | string | null;
  windowEnd?: Date | string | null;
  actionLabel?: string | null;
}) {
  const title = venueName ?? name ?? "Untitled Game";
  const subtitle = venueName && name ? name : undefined;
  const venueLed = Boolean(venueName);
  const meta = venueLed
    ? [
        formatRelativeDay(startTime),
        formatGameTimeWindow(windowStart, windowEnd, startTime),
        occupancy,
        location,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · ")
    : [
        formatRelativeDay(startTime),
        formatGameStart(startTime),
        groupName ?? "Pickup",
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · ");

  const trailing = (
    <div className="flex flex-wrap items-center gap-2">
      {venueLed ? null : sport ? <SportBadge sport={sport} /> : null}
      {cancelled ? <GameStatusBadge status="cancelled" /> : null}
      {actionLabel ? (
        <span className="text-body text-brand font-semibold">
          {actionLabel}
        </span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <ListRow
        asChild
        title={title}
        subtitle={subtitle}
        meta={meta}
        trailing={trailing}
      >
        <Link href={href} />
      </ListRow>
    );
  }

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      meta={meta}
      trailing={trailing}
    />
  );
}
