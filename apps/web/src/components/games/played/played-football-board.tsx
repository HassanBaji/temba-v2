import { bibColors, colors } from "@repo/design-tokens";
import type { FootballBib } from "@repo/domain/football-lineup";
import type {
  PlayedFootballSide,
  PlayedScorer,
} from "@repo/domain/played-game";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/** A bib square as it reads on ink: a black bib gets a dim edge. */
function InkBibChip({ bib }: { bib: FootballBib }) {
  const { fill } = bibColors[bib];
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-[4px] border"
      style={{
        backgroundColor: fill,
        borderColor: bib === "black" ? colors.dim : fill,
      }}
    />
  );
}

function SideName({
  side,
  align,
}: {
  side: PlayedFootballSide;
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1",
        right ? "items-end text-end" : "items-start",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-2 font-semibold",
          right && "flex-row-reverse",
        )}
      >
        <InkBibChip bib={side.bib} />
        <span className="truncate">{side.name}</span>
      </span>
      <span className="text-dim text-meta">{side.average}</span>
    </div>
  );
}

function ScorerList({
  scorers,
  align,
}: {
  scorers: PlayedScorer[];
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <ul
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1.5",
        right ? "items-end text-end" : "items-start",
      )}
    >
      {scorers.map((scorer) => (
        <li
          key={scorer.userId}
          className={cn(
            "text-meta flex max-w-full items-baseline gap-2",
            right && "flex-row-reverse",
          )}
        >
          <span
            className={cn("min-w-0 truncate", scorer.isYou && "font-semibold")}
          >
            {scorer.name}
          </span>
          <span className="text-dim shrink-0 font-mono text-[10px]">
            {scorer.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Both teams' goals, the winner in full ink, then who scored them. */
export function PlayedFootballBoard({
  sides,
  hasWinner,
  scorers,
}: {
  sides: [PlayedFootballSide, PlayedFootballSide];
  hasWinner: boolean;
  scorers: { a: PlayedScorer[]; b: PlayedScorer[] } | null;
}) {
  const m = useMessages();
  const [a, b] = sides;
  const ink = (side: PlayedFootballSide) =>
    side.won || !hasWinner ? "text-on-focus" : "text-muted-foreground";
  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3"
        aria-label={m.webGame.played.scoreLabel(
          a.name,
          a.score,
          b.name,
          b.score,
        )}
      >
        <SideName side={a} align="left" />
        <div className="font-expanded flex items-baseline gap-2.5 text-[60px] tabular-nums leading-[0.94]">
          <span className={ink(a)}>{a.score}</span>
          <span className="text-muted-foreground text-[24px]">–</span>
          <span className={ink(b)}>{b.score}</span>
        </div>
        <SideName side={b} align="right" />
      </div>
      {scorers ? (
        <div className="border-dimrule flex gap-4 border-t pt-4">
          <ScorerList scorers={scorers.a} align="left" />
          <ScorerList scorers={scorers.b} align="right" />
        </div>
      ) : null}
    </div>
  );
}
