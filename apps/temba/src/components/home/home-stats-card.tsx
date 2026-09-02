import { ProgressRing } from "~/components/common/progress-ring";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";

function winRatePercent(gamesPlayed: number, gamesWon: number) {
  if (gamesPlayed === 0) {
    return 0;
  }
  return Math.round((gamesWon / gamesPlayed) * 100);
}

const FORM_TIERS = [
  { minWinRate: 75, emoji: "🔥", headline: "You're on fire" },
  { minWinRate: 50, emoji: "💪", headline: "Winning more than losing" },
  { minWinRate: 25, emoji: "🌱", headline: "Momentum is building" },
  { minWinRate: 0, emoji: "👊", headline: "Every game counts" },
] as const;

function formSummary(gamesPlayed: number, gamesWon: number, winRate: number) {
  if (gamesPlayed === 0) {
    return {
      emoji: "🎯",
      headline: "Your stats start here",
      detail: "Play your first game to build your record",
    };
  }

  const tier =
    FORM_TIERS.find((entry) => winRate >= entry.minWinRate) ?? FORM_TIERS[3];

  return {
    emoji: tier.emoji,
    headline: tier.headline,
    detail: `${gamesWon} of ${gamesPlayed} ${gamesPlayed === 1 ? "game" : "games"} won`,
  };
}

export function HomeStatsCard({
  gamesPlayed,
  gamesWon,
  className,
}: {
  gamesPlayed: number;
  gamesWon: number;
  className?: string;
}) {
  const winRate = winRatePercent(gamesPlayed, gamesWon);
  const playedFill = gamesPlayed > 0 ? 100 : 0;
  const summary = formSummary(gamesPlayed, gamesWon, winRate);

  return (
    <Card className={cn("mt-4 w-full overflow-hidden", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-surface-raised border-border flex size-10 shrink-0 items-center justify-center rounded-full border text-lg"
        >
          {summary.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-body text-foreground truncate font-semibold">
            {summary.headline}
          </p>
          <p className="text-meta text-muted-foreground truncate">
            {summary.detail}
          </p>
        </div>
      </div>

      <div className="divide-border border-border grid grid-cols-3 divide-x border-t pt-3 md:pt-4">
        <ProgressRing
          value={playedFill}
          label="Played"
          emoji="🏟️"
          ariaLabel={`Games played: ${gamesPlayed}`}
          strokeClassName="stroke-primary"
        >
          {gamesPlayed}
        </ProgressRing>
        <ProgressRing
          value={winRate}
          label="Wins"
          emoji="🏆"
          ariaLabel={`Wins: ${gamesWon}`}
          strokeClassName="stroke-success"
        >
          {gamesWon}
        </ProgressRing>
        <ProgressRing
          value={winRate}
          label="Win rate"
          emoji="📈"
          ariaLabel={`Win rate: ${winRate}%`}
          strokeClassName="stroke-warning"
        >
          {winRate}%
        </ProgressRing>
      </div>
    </Card>
  );
}
