import { DividedFigurePair } from "~/components/home/home-all-time";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Surface } from "~/components/ui/surface";
import type { FootballGameHero } from "@repo/domain/football-game-details";
import { sportLabel } from "@repo/domain/sport";

export function FootballGameHeroCard({ hero }: { hero: FootballGameHero }) {
  const dark = hero.tone === "ink";
  return (
    <Surface
      as="article"
      tone={hero.tone}
      radius="surface"
      className="p-[22px]"
    >
      <div className="text-dim text-meta flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">{hero.dateLabel ?? "Time unset"}</p>
        {hero.statusLabel ? (
          <p className="shrink-0 text-right tabular-nums">{hero.statusLabel}</p>
        ) : null}
      </div>
      <h1 className="font-expanded text-display mt-3 leading-none tracking-[-0.03em]">
        {hero.sizeLine}
      </h1>
      {hero.kickoffTime ? (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="font-expanded text-[32px] tabular-nums leading-none">
            {hero.kickoffTime}
          </span>
          <span className="text-dim text-[18px] leading-none">
            {hero.trailer}
          </span>
        </p>
      ) : null}
      {hero.placeLine ? (
        <p className="text-lead mt-3 font-semibold">{hero.placeLine}</p>
      ) : null}
      <p className="text-dim text-meta mt-2 flex items-center gap-1.5">
        <SportGlyph sport="football" />
        {sportLabel("football")}
      </p>
      <div className="mt-4">
        <DividedFigurePair
          surface={dark ? "dark" : "light"}
          figures={hero.figures}
        />
      </div>
    </Surface>
  );
}
