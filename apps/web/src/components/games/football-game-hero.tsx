import type { footballHeroLines } from "@repo/domain/football-board";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { Surface } from "~/components/ui/surface";

/**
 * The head of a football Game: status, kick-off time, the day and pitch,
 * then whatever the Game shows next (the pool or the two teams).
 */
export function FootballGameHeroCard({
  tone,
  lines,
  children,
}: {
  tone: SurfaceTone;
  lines: ReturnType<typeof footballHeroLines>;
  children?: React.ReactNode;
}) {
  const muted = tone === "ink" ? "text-dim" : "text-muted-foreground";
  return (
    <Surface
      as="article"
      tone={tone}
      radius="surface"
      className={tone === "paper" ? "border-rule border p-[22px]" : "p-[22px]"}
    >
      <div
        className={`${muted} text-meta flex items-start justify-between gap-3`}
      >
        <p className="min-w-0 truncate">{lines.status}</p>
        {lines.sizeTag ? (
          <p className="shrink-0 font-mono text-[11px]">{lines.sizeTag}</p>
        ) : null}
      </div>
      {lines.time ? (
        <h1 className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="font-expanded text-[56px] tabular-nums leading-none">
            {lines.time}
          </span>
          {lines.meridiem ? (
            <span className={`${muted} text-title leading-none`}>
              {lines.meridiem}
            </span>
          ) : null}
        </h1>
      ) : (
        <h1 className="font-expanded text-display mt-2">Time unset</h1>
      )}
      {lines.dayLine ? (
        <p className="text-lead mt-2 font-semibold">{lines.dayLine}</p>
      ) : null}
      {lines.subLine ? (
        <p className={`${muted} text-meta`}>{lines.subLine}</p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </Surface>
  );
}
