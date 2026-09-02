import { Award, Medal, Trophy } from "lucide-react";

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
}: {
  position: number;
  name: string;
  image?: string | null;
  totalSetsWon: number;
  totalPointsWon: number;
  totalGamesPlayed: number;
  isViewer: boolean;
}) {
  return (
    <li
      className={cn(
        "flex min-h-16 min-w-11 items-center gap-3 px-4 py-3",
        isViewer && "bg-muted border-l-volt border-l-2",
      )}
    >
      <div className="w-12 shrink-0">
        <RankSlot position={position} />
      </div>
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
    </li>
  );
}
