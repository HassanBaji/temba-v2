"use client";

import { ArrowRight } from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";

import { useLocale } from "~/components/locale-provider";
import { YouCard } from "~/components/you/you-section";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  profileSeriesAllModel,
  profileSeriesCardModel,
  profileSeriesSheetModel,
  type ProfileSeriesBadge,
} from "./profile-series-model";
import { ProfileSeriesSheet } from "./profile-series-sheet";
import { SeriesBadge } from "./series-badge";

type Opened = { mode: "series"; badge: ProfileSeriesBadge } | { mode: "all" };

const FOCUS_RING =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function BadgeButton({
  badge,
  onOpen,
}: {
  badge: ProfileSeriesBadge;
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={badge.label}
      onClick={onOpen}
      className={cn(
        "hover:bg-wash flex w-full min-w-0 flex-col items-center gap-[7px] rounded-[12px] px-1 py-1.5 transition-colors",
        FOCUS_RING,
      )}
    >
      <SeriesBadge
        emblem={badge.emblem}
        colour={badge.colour}
        size="card"
        count={badge.wins}
      />
      <span className="flex min-w-0 flex-col items-center text-center">
        <span
          dir="auto"
          className="text-eyebrow text-ink break-words font-semibold leading-[1.25]"
        >
          {badge.name}
        </span>
        {badge.groupName ? (
          <span
            dir="auto"
            className="text-eyebrow text-muted-foreground break-words leading-[1.3]"
          >
            {badge.groupName}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * A player's Series wins on their profile (4a): a badge per Series won, each
 * opening the wins behind it, and "All series wins". Not split by sport. No
 * card while loading, when hidden, or with nothing won.
 */
export function ProfileSeriesCard({ userId }: { userId: string }) {
  const locale = useLocale();
  const forPlayer = api.series.forPlayer.useQuery({ userId });
  const [opened, setOpened] = useState<Opened | null>(null);
  // Keeps the last sheet's content while it animates closed.
  const [shown, setShown] = useState<Opened | null>(null);
  if (opened && opened !== shown) {
    setShown(opened);
  }
  const opener = useRef<HTMLElement | null>(null);
  const seriesId = shown?.mode === "series" ? shown.badge.seriesId : null;
  const wins = api.series.playerWins.useQuery(
    { userId, seriesId: seriesId ?? "" },
    { enabled: seriesId !== null },
  );

  const card = profileSeriesCardModel(forPlayer.data, locale);
  if (!card || !forPlayer.data || forPlayer.data.hidden) {
    return null;
  }
  const data = forPlayer.data;

  const open = (next: Opened) => (event: MouseEvent<HTMLElement>) => {
    opener.current = event.currentTarget;
    setOpened(next);
  };
  const sheet = !shown
    ? null
    : shown.mode === "all"
      ? profileSeriesAllModel(data, locale)
      : profileSeriesSheetModel(shown.badge, wins.data, locale);

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-expanded text-title text-ink">{card.title}</h2>
        <p className="text-meta text-muted-foreground shrink-0">{card.meta}</p>
      </div>
      <YouCard>
        <ul className="grid grid-cols-3 gap-2 px-3 py-4">
          {card.badges.map((badge) => (
            <li key={badge.seriesId} className="flex min-w-0 justify-center">
              <BadgeButton
                badge={badge}
                onOpen={open({ mode: "series", badge })}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={open({ mode: "all" })}
          className={cn(
            "border-rule text-meta hover:bg-wash flex min-h-11 w-full items-center justify-between gap-3 border-t px-4 py-3 text-start font-semibold transition-colors focus-visible:ring-inset",
            FOCUS_RING,
          )}
        >
          {card.allWins}
          <ArrowRight
            aria-hidden="true"
            className="size-[15px] shrink-0 rtl:-scale-x-100"
          />
        </button>
      </YouCard>
      <ProfileSeriesSheet
        open={opened !== null}
        model={sheet}
        error={wins.error}
        onRetry={() => {
          void wins.refetch();
        }}
        onClose={() => setOpened(null)}
        returnFocus={() => opener.current?.focus()}
      />
    </section>
  );
}
