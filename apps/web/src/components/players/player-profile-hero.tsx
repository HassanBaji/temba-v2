"use client";

import { useEffect, useState } from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import { useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import type {
  ProfileLevelView,
  SportSwitchOption,
} from "@repo/domain/player-profile-page";
import type { Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

import { PlayerBackButton } from "./player-header";

function SportSwitch({
  options,
  onSelect,
}: {
  options: SportSwitchOption[];
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  return (
    <RovingRadioGroup
      aria-label={m.webUi.sport}
      className="border-dimrule grid grid-cols-2 gap-[3px] rounded-[12px] border p-[3px]"
    >
      {options.map((option) => (
        <button
          key={option.sport}
          type="button"
          role="radio"
          aria-checked={option.selected}
          onClick={() => onSelect(option.sport)}
          className={cn(
            "focus-visible:ring-ring/50 flex h-[50px] flex-col items-center justify-center gap-0.5 rounded-[9px] outline-none transition-colors focus-visible:ring-[3px]",
            option.selected
              ? "bg-paper text-ink"
              : "text-dim hover:text-paper bg-transparent",
          )}
        >
          <span className="text-meta font-semibold">{option.name}</span>
          {option.meta ? (
            <span className="text-eyebrow text-muted-foreground tabular-nums">
              {option.meta}
            </span>
          ) : null}
        </button>
      ))}
    </RovingRadioGroup>
  );
}

function LevelTrack({
  percent,
  hatched,
}: {
  percent: number;
  hatched: boolean;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mt-2.5 h-2 w-full overflow-hidden rounded-[4px]",
        hatched ? "hatch hatch-on-ink" : "bg-dimrule",
      )}
    >
      <div
        className="bg-paper h-full rounded-[4px] motion-reduce:transition-none"
        style={{
          width: drawn ? `${percent}%` : "0%",
          transition: "width 900ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        }}
      />
    </div>
  );
}

function LevelBlock({ view }: { view: ProfileLevelView }) {
  if (view.kind === "none") {
    return (
      <section className="border-dimrule rounded-[16px] border p-[18px]">
        <h2 className="text-eyebrow text-dim font-normal">{view.label}</h2>
        <p className="font-expanded text-h2 mt-1.5">{view.value}</p>
      </section>
    );
  }

  return (
    <section className="border-dimrule rounded-[16px] border p-[18px]">
      <span className="sr-only">{view.spoken}</span>
      <div aria-hidden="true">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-eyebrow text-dim font-normal">{view.label}</h2>
          <p className="flex flex-col items-end gap-0.5 text-end">
            <span className="text-meta font-semibold">{view.status}</span>
            <span className="text-eyebrow text-dim tabular-nums">
              {view.statusDetail}
            </span>
          </p>
        </div>
        <p className="mt-1.5 flex items-baseline gap-3.5">
          <span dir="ltr" className="font-expanded text-[72px] leading-[0.9]">
            {view.band}
          </span>
          <span className="font-expanded text-[30px] tabular-nums leading-none">
            {view.level}
          </span>
          {view.trend ? (
            <span className="text-meta ms-auto font-semibold tabular-nums">
              {view.trend}
            </span>
          ) : null}
        </p>
        <div className="mt-4 flex items-baseline justify-between gap-2.5">
          <span className="text-body font-semibold tabular-nums">
            {view.lead}
          </span>
          {view.trail ? (
            <span className="text-eyebrow text-dim tabular-nums">
              {view.trail}
            </span>
          ) : null}
        </div>
        <LevelTrack percent={view.percent} hatched={view.hatched} />
      </div>
    </section>
  );
}

/** The black hero: who the player is, which sport the page reads, and their Level. */
export function PlayerProfileHero({
  name,
  image,
  subtitle,
  switchOptions,
  onSelectSport,
  level,
}: {
  name: string;
  image: string | null;
  subtitle: string | null;
  switchOptions: SportSwitchOption[] | null;
  onSelectSport: (sport: Sport) => void;
  level: ProfileLevelView;
}) {
  return (
    <header className="surface-ink bg-ink text-paper rounded-card flex flex-col gap-5 p-[22px]">
      <PlayerBackButton surface="ink" />
      <div className="flex items-center gap-4">
        <UserAvatar
          name={name}
          image={image}
          className="text-ink [&_[data-slot=avatar-fallback]]:bg-paper [&_[data-slot=avatar-fallback]]:text-ink size-16 rounded-[15px] text-[20px] font-bold data-[size=default]:size-16 [&_[data-slot=avatar-fallback]]:rounded-[15px] [&_[data-slot=avatar-fallback]]:text-[20px]"
        />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[28px] font-bold leading-[1.1] tracking-[-0.01em]">
            {name}
          </h1>
          {subtitle ? (
            <p className="text-meta text-dim mt-1.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {switchOptions ? (
        <SportSwitch options={switchOptions} onSelect={onSelectSport} />
      ) : null}
      <LevelBlock view={level} />
    </header>
  );
}
