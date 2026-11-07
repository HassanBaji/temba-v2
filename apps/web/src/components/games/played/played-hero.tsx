"use client";

import {
  playedTagLabel,
  type PlayedResultLine,
  type PlayedYouLine,
} from "@repo/domain/played-game";

import { UserAvatar } from "~/components/common/user-avatar";
import { HeroNavRow } from "~/components/games/hero-nav-row";
import { HeroTopLine } from "~/components/games/hero-top-line";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";

/** Edge to edge on phones, matching the mobile App; a card from `md` up. */
const HERO_BLEED =
  "-mx-4 px-4 py-[22px] min-[430px]:-mx-5 min-[430px]:px-5 md:mx-0 md:rounded-xl md:p-[22px]";

/** The won mark as it reads on ink: a paper disc with the arc cut in ink. */
export function InkWonMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn("block shrink-0", className)}
    >
      <circle cx="50" cy="50" r="44" fill="var(--color-paper)" />
      <path
        d="M6,50 C18,16 82,16 94,50"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="5"
      />
    </svg>
  );
}

/** A small mono tag: solid for a win, outlined otherwise. */
function Pill({ label, solid = false }: { label: string; solid?: boolean }) {
  return (
    <span
      className={cn(
        "text-eyebrow rounded-[6px] border px-2 py-1 font-mono tracking-[0.08em]",
        solid
          ? "bg-paper text-ink border-paper"
          : "text-paper border-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export type PlayedHeroProps = {
  dateLine: string;
  tag: string | null;
  result: PlayedResultLine;
  venueLine: string | null;
  whenLine: string | null;
  you: PlayedYouLine | null;
  avatar: { name: string; image: string | null } | null;
  /** Share and the organizer's menu, top right across from back. */
  actions?: React.ReactNode;
  /** The MVP row, last in the hero; it sets its own top margin. */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The black head of a played Game: the result leads, then where it was and
 * your own line. Join and leave are gone; share and the organizer's menu
 * take their place.
 */
export function PlayedHero({
  dateLine,
  tag,
  result,
  venueLine,
  whenLine,
  you,
  avatar,
  actions,
  footer,
  children,
}: PlayedHeroProps) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <Surface as="article" tone="ink" className={HERO_BLEED}>
      <HeroNavRow tone="ink" actions={actions} />

      <div className="mt-6">
        <HeroTopLine
          tone="ink"
          left={dateLine}
          right={
            tag ? (
              <p className="shrink-0 font-mono text-[11px] tracking-[0.08em]">
                {tag}
              </p>
            ) : null
          }
        />
      </div>

      <div className="mt-4">{children}</div>

      <div className="mt-4 flex items-center gap-2.5">
        {result.hasWinner ? <InkWonMark className="size-4" /> : null}
        <p className="min-w-0 flex-1 font-semibold">{result.line}</p>
        <span className="text-dim border-dimrule text-eyebrow rounded-[6px] border px-[7px] py-1 font-mono tracking-[0.08em]">
          {m.webGame.played.confirmed}
        </span>
      </div>

      {venueLine || whenLine ? (
        <div className="mt-5">
          {venueLine ? <p className="text-lead">{venueLine}</p> : null}
          {whenLine ? <p className="text-dim text-meta">{whenLine}</p> : null}
        </div>
      ) : null}

      {you ? (
        <div className="border-dimrule mt-5 flex items-center gap-3 border-t pt-4">
          {avatar ? (
            <UserAvatar
              name={avatar.name}
              image={avatar.image}
              size="lg"
              className="ring-paper ring-2"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{you.line}</p>
            <p className="text-dim text-meta">{you.ratingLine}</p>
          </div>
          <Pill label={playedTagLabel(you.tag, locale)} solid={you.won} />
        </div>
      ) : null}

      {footer}
    </Surface>
  );
}
