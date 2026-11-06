"use client";

import { useUser } from "@clerk/nextjs";
import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { ResultMark } from "~/components/temba/result-mark";
import { YouCard, YouSection } from "~/components/you/you-section";
import { initials } from "@repo/domain/initials";
import type { CourtSideFill } from "@repo/domain/player-profile";
import type {
  EarlyDaysView,
  PartnerRowView,
  ProfileFormView,
  ProfilePositionView,
  ProfileStatTile,
  ProfileStreaksView,
  WithViewerView,
} from "@repo/domain/player-profile-page";
import { playerProfilePath } from "~/lib/dashboard-paths";
import type { Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

import type { ProfileMatchRow } from "./player-profile-model";

const TILE = "px-[18px] py-4";

/** Ten result marks, oldest first; the row follows the reading direction. */
export function FormMarks({ form }: { form: ProfileFormView }) {
  return (
    <div>
      <span className="sr-only">{form.spoken}</span>
      <div aria-hidden="true" className="grid grid-cols-10 gap-1.5">
        {form.slots.map((slot, index) => (
          <ResultMark
            key={index}
            variant={slot}
            decorative
            className="aspect-square w-full"
          />
        ))}
      </div>
      {form.ends ? (
        <div
          aria-hidden="true"
          className="text-eyebrow text-muted-foreground mt-1.5 flex justify-between"
        >
          <span>{form.ends.oldest}</span>
          <span>{form.ends.newest}</span>
        </div>
      ) : null}
    </div>
  );
}

export function EarlyDaysCard({
  view,
  form,
}: {
  view: EarlyDaysView;
  form: ProfileFormView;
}) {
  return (
    <YouCard className={TILE}>
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 className="font-expanded text-title">{view.title}</h2>
        {view.since ? (
          <p className="text-meta text-muted-foreground shrink-0">
            {view.since}
          </p>
        ) : null}
      </div>
      <p className="text-meta text-muted-foreground mt-1">{view.note}</p>
      <div className="mt-4">
        <FormMarks form={form} />
      </div>
    </YouCard>
  );
}

function StreakColumn({
  label,
  value,
  unit,
  spoken,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  spoken: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 flex-1", TILE)}>
      <span className="sr-only">{spoken}</span>
      <div aria-hidden="true">
        <p className="text-eyebrow text-muted-foreground">{label}</p>
        <p className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-expanded text-[34px] tabular-nums leading-none">
            {value}
          </span>
          <span className="text-meta text-muted-foreground">{unit}</span>
        </p>
        {children}
      </div>
    </div>
  );
}

export function StreakTiles({
  view,
  labels,
}: {
  view: ProfileStreaksView;
  labels: { current: string; best: string };
}) {
  return (
    <YouCard className="divide-rule flex divide-x">
      <StreakColumn
        label={labels.current}
        value={view.current.value}
        unit={view.current.unit}
        spoken={view.current.spoken}
      >
        {view.current.marks > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {Array.from({ length: view.current.marks }, (_, index) => (
              <ResultMark
                key={index}
                variant="won"
                decorative
                className="size-3.5"
              />
            ))}
          </div>
        ) : null}
      </StreakColumn>
      <StreakColumn
        label={labels.best}
        value={view.best.value}
        unit={view.best.unit}
        spoken={view.best.spoken}
      >
        {view.best.when ? (
          <p className="text-eyebrow text-muted-foreground mt-2.5">
            {view.best.when}
          </p>
        ) : null}
      </StreakColumn>
    </YouCard>
  );
}

const PITCH_SPOT_Y = { gk: 78, def: 63, mid: 43, fwd: 20 } as const;

function Pitch({
  spot,
}: {
  spot: Extract<ProfilePositionView, { sport: "football" }>["spot"];
}) {
  return (
    <svg
      viewBox="0 0 62 86"
      aria-hidden="true"
      className="text-ink h-[86px] w-[62px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x={1} y={1} width={60} height={84} rx={3} className="fill-paper" />
      <line x1={1} y1={43} x2={61} y2={43} />
      <circle cx={31} cy={43} r={7} />
      <rect x={16} y={1} width={30} height={12} />
      <rect x={16} y={73} width={30} height={12} />
      {spot ? (
        <circle
          cx={31}
          cy={PITCH_SPOT_Y[spot]}
          r={7}
          className="fill-ink stroke-paper"
          strokeWidth={2.5}
        />
      ) : null}
    </svg>
  );
}

function NearSide({ fill }: { fill: CourtSideFill }) {
  return (
    <span
      className={cn(
        "relative flex-1",
        fill === "ink" && "bg-ink",
        fill === "hatch" && "hatch",
      )}
    />
  );
}

function Court({
  court,
}: {
  court: Extract<ProfilePositionView, { sport: "padel" }>["court"];
}) {
  return (
    // A court diagram, not reading order: the right half stays on the right in Arabic.
    <span
      aria-hidden="true"
      dir="ltr"
      className="border-ink flex h-[86px] w-[62px] shrink-0 flex-col overflow-hidden rounded-[4px] border-[1.5px]"
    >
      <span className="hatch border-ink flex-1 border-b-2" />
      <span className="divide-ink flex flex-1 divide-x">
        <NearSide fill={court.left} />
        <NearSide fill={court.right} />
      </span>
    </span>
  );
}

export function PositionCard({ view }: { view: ProfilePositionView }) {
  return (
    <YouCard className={cn("flex items-center gap-[18px]", TILE)}>
      {view.sport === "football" ? (
        <Pitch spot={view.spot} />
      ) : (
        <Court court={view.court} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-eyebrow text-muted-foreground">{view.label}</p>
        <p className="font-expanded text-title mt-1">{view.value}</p>
        {view.detail ? (
          <p className="text-meta text-muted-foreground mt-1 tabular-nums">
            {view.detail}
          </p>
        ) : null}
      </div>
    </YouCard>
  );
}

function StatTile({ tile }: { tile: ProfileStatTile }) {
  return (
    <div
      className={cn(
        "relative min-w-0 px-[18px] py-3.5",
        tile.locked && "hatch",
      )}
    >
      <p
        className={cn(
          "font-expanded relative tabular-nums leading-tight",
          tile.locked ? "text-muted-foreground text-body" : "text-ink text-h2",
        )}
      >
        {tile.value}
      </p>
      <p className="text-eyebrow text-muted-foreground relative mt-0.5">
        {tile.label}
      </p>
    </div>
  );
}

export function StatsGrid({
  title,
  meta,
  tiles,
}: {
  title: string;
  meta: string;
  tiles: ProfileStatTile[];
}) {
  return (
    <YouSection title={title} meta={meta}>
      <YouCard className="divide-rule divide-y">
        {[tiles.slice(0, 2), tiles.slice(2, 4)].map((row, index) => (
          <div key={index} className="divide-rule grid grid-cols-2 divide-x">
            {row.map((tile) => (
              <StatTile key={tile.label} tile={tile} />
            ))}
          </div>
        ))}
      </YouCard>
    </YouSection>
  );
}

function ViewerTile() {
  const { user } = useUser();
  return (
    <span className="bg-control text-on-control text-eyebrow flex size-7 items-center justify-center rounded-[8px]">
      {initials(user?.fullName ?? "")}
    </span>
  );
}

export function WithViewerCard({
  view,
  playerName,
  playerImage,
}: {
  view: WithViewerView;
  playerName: string;
  playerImage: string | null;
}) {
  return (
    <YouCard>
      <div className={TILE}>
        <span className="sr-only">{view.spoken}</span>
        <div aria-hidden="true">
          <div className="flex items-center gap-2.5">
            <span className="flex shrink-0">
              <ViewerTile />
              <UserAvatar
                name={playerName}
                image={playerImage}
                className="border-rule text-eyebrow [&_[data-slot=avatar-fallback]]:bg-paper -ms-1.5 size-7 rounded-[8px] border data-[size=default]:size-7 [&_[data-slot=avatar-fallback]]:rounded-[8px]"
              />
            </span>
            <p className="text-body flex-1 truncate font-semibold">
              {view.title}
            </p>
            {view.scope ? (
              <p className="text-eyebrow text-muted-foreground shrink-0">
                {view.scope}
              </p>
            ) : null}
          </div>
          {view.columns ? (
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              {view.columns.map((column) => (
                <div key={column.label} className="min-w-0">
                  <p className="text-eyebrow text-muted-foreground">
                    {column.label}
                  </p>
                  <p className="text-body mt-0.5">
                    <span dir="ltr" className="font-expanded tabular-nums">
                      {column.record}
                    </span>
                    {column.detail ? ` ${column.detail}` : null}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {view.empty ? (
            <p className="text-meta text-muted-foreground mt-3">{view.empty}</p>
          ) : null}
        </div>
      </div>
      {view.groups ? (
        <p
          aria-hidden="true"
          className="border-rule text-eyebrow text-muted-foreground flex items-center gap-2.5 border-t px-[18px] py-[11px]"
        >
          <Users className="size-3.5 shrink-0" />
          <span className="truncate">{view.groups}</span>
        </p>
      ) : null}
    </YouCard>
  );
}

export function PartnersList({
  title,
  meta,
  rows,
  sport,
}: {
  title: string;
  meta: string;
  rows: readonly PartnerRowView[];
  sport: Sport;
}) {
  return (
    <YouSection title={title} meta={meta}>
      <YouCard>
        <ul className="divide-rule divide-y">
          {rows.map((row) => (
            <li key={row.userId}>
              <Link
                href={playerProfilePath(row.userId, sport)}
                className="hover:bg-wash focus-visible:ring-ring/50 flex items-center gap-3 px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
              >
                <span className="sr-only">{row.spoken}</span>
                <UserAvatar
                  name={row.name}
                  image={row.image}
                  className="border-rule text-eyebrow [&_[data-slot=avatar-fallback]]:bg-paper size-[34px] rounded-[9px] border font-semibold data-[size=default]:size-[34px] [&_[data-slot=avatar-fallback]]:rounded-[9px]"
                />
                <div aria-hidden="true" className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-body text-ink truncate">
                      {row.name}
                    </span>
                    <span
                      dir="ltr"
                      className="text-meta text-ink shrink-0 font-semibold tabular-nums"
                    >
                      {row.record}
                    </span>
                  </div>
                  <div className="bg-wash mt-1.5 h-1 overflow-hidden rounded-full">
                    <div
                      className="bg-ink h-full rounded-full"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="text-eyebrow text-muted-foreground w-[34px] shrink-0 text-end tabular-nums"
                >
                  {row.percent}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </YouCard>
    </YouSection>
  );
}

const ROW = "flex min-h-11 items-center gap-3 px-4 py-3.5";

function MatchRowBody({ row }: { row: ProfileMatchRow }) {
  return (
    <>
      <span className="sr-only">{row.accessibilityLabel}</span>
      <ResultMark variant={row.outcome} decorative className="size-[18px]" />
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="text-body block truncate">{row.title}</span>
        <span className="text-eyebrow text-muted-foreground block truncate">
          {row.sub}
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-end">
        {row.score ? (
          <span
            dir="ltr"
            className="text-body block whitespace-nowrap font-semibold tabular-nums"
          >
            {row.score}
          </span>
        ) : null}
        {row.detail ? (
          <span className="text-eyebrow text-muted-foreground block tabular-nums">
            {row.detail}
          </span>
        ) : null}
      </span>
    </>
  );
}

export function MatchList({
  rows,
  seeAll,
}: {
  rows: readonly ProfileMatchRow[];
  seeAll: { label: string; href: string } | null;
}) {
  return (
    <>
      <YouCard>
        <ul className="divide-rule divide-y">
          {rows.map((row) => (
            <li key={row.key}>
              {row.href ? (
                <Link
                  href={row.href}
                  className={cn(
                    ROW,
                    "hover:bg-wash focus-visible:ring-ring/50 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset",
                  )}
                >
                  <MatchRowBody row={row} />
                </Link>
              ) : (
                <div className={ROW}>
                  <MatchRowBody row={row} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </YouCard>
      {seeAll ? (
        <Link
          href={seeAll.href}
          className="border-rule hover:bg-wash flex h-12 items-center justify-center gap-1 rounded-[12px] border font-semibold transition-colors"
        >
          {seeAll.label}
          <ChevronRight
            aria-hidden="true"
            className="size-4 rtl:-scale-x-100"
          />
        </Link>
      ) : null}
    </>
  );
}
