import { Award, ChevronRight, Medal, Trophy } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const RANK_ICONS = {
  1: Trophy,
  2: Medal,
  3: Award,
} as const;

const RANK_WEIGHT = {
  1: "font-bold",
  2: "font-semibold",
  3: "font-medium",
} as const;

function RankSlot({ position }: { position: number }) {
  if (position === 1 || position === 2 || position === 3) {
    const Icon = RANK_ICONS[position];
    return (
      <span
        className={cn(
          "bg-muted text-foreground inline-flex min-h-7 min-w-10 items-center justify-center gap-0.5 rounded-full px-1.5 tabular-nums",
          RANK_WEIGHT[position],
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
        {position}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground inline-flex min-w-10 justify-end font-normal tabular-nums">
      #{position}
    </span>
  );
}

export function LeaderboardRow({
  position,
  name,
  image,
  totalSetsWon,
  totalPointsWon,
  totalGamesPlayed,
  isViewer,
  showRank = true,
}: {
  position: number;
  name: string;
  image?: string | null;
  totalSetsWon: number;
  totalPointsWon: number;
  totalGamesPlayed: number;
  isViewer: boolean;
  showRank?: boolean;
}) {
  const body = (
    <>
      {showRank ? (
        <div className="w-12 shrink-0">
          <RankSlot position={position} />
        </div>
      ) : null}
      <UserAvatar name={name} image={image} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-lead truncate font-semibold">
          {name}
          {isViewer ? (
            <Badge variant="outline" className="ml-2 align-middle">
              You
            </Badge>
          ) : null}
        </p>
        <p className="text-meta text-muted-foreground truncate">
          {totalSetsWon} sets · {totalPointsWon} pts · {totalGamesPlayed} Games
        </p>
      </div>
      {isViewer ? (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
          strokeWidth={1.75}
        />
      ) : null}
    </>
  );

  const rowClass = cn(
    "flex min-h-16 min-w-11 items-center gap-3 px-4 py-3",
    isViewer && "bg-muted",
  );

  if (isViewer) {
    return (
      <li className="p-0">
        <Link href="/dashboard/you" className={rowClass}>
          {body}
        </Link>
      </li>
    );
  }

  return <li className={rowClass}>{body}</li>;
}
