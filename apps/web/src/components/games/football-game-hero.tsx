"use client";

import type { footballHeroLines } from "@repo/domain/football-board";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { ChallengeTag } from "~/components/games/challenge-tag";
import { HeroNavRow } from "~/components/games/hero-nav-row";
import { HeroTopLine } from "~/components/games/hero-top-line";
import { Surface } from "~/components/ui/surface";
import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/** Edge to edge on phones, matching the mobile App; a card from `md` up. */
const HERO_BLEED =
  "-mx-4 px-4 py-[22px] min-[430px]:-mx-5 min-[430px]:px-5 md:mx-0 md:rounded-xl md:p-[22px]";

/**
 * The head of a football Game: back and the actions, status, kick-off time,
 * the day and pitch, then whatever the Game shows next (the pool or the two
 * teams).
 */
export function FootballGameHeroCard({
  tone,
  lines,
  tag,
  actions,
  children,
}: {
  tone: SurfaceTone;
  lines: ReturnType<typeof footballHeroLines>;
  /** "Challenge" on a Challenge Game: beside share, its format moved to the sub line. */
  tag?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const m = useMessages();
  const muted = tone === "ink" ? "text-dim" : "text-muted-foreground";
  return (
    <Surface
      as="article"
      tone={tone}
      className={cn(
        HERO_BLEED,
        tone === "paper" && "border-rule border-y md:border",
      )}
    >
      <HeroNavRow
        tone={tone}
        actions={
          tag ? (
            <>
              <ChallengeTag label={tag} tone={tone} />
              {actions}
            </>
          ) : (
            actions
          )
        }
      />
      <div className="mt-6">
        <HeroTopLine
          tone={tone}
          left={lines.status}
          right={
            !tag && lines.sizeTag ? (
              <p className="shrink-0 font-mono text-[11px]">{lines.sizeTag}</p>
            ) : null
          }
        />
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
        <h1 className="font-expanded text-display mt-2">
          {m.webTournament.footballDetails.timeUnset}
        </h1>
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
