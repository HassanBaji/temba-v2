"use client";

import {
  ArrowRight,
  ListOrdered,
  MapPin,
  PenLine,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { SummaryCardShell } from "~/components/games/summary-card-shell";
import { useLocale } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Hatch } from "~/components/ui/hatch";
import { Surface } from "~/components/ui/surface";
import { useNow } from "~/hooks/use-now";
import { gameHomeIntentHref } from "~/lib/game-home-tab";
import { cn } from "~/lib/utils";
import type { MyTournament, MyTournamentPair } from "@repo/domain/hub-game-row";
import type { SurfaceTone } from "@repo/domain/surface-tone";
import {
  tournamentGamesCardModel,
  tournamentPlayedCardModel,
  type TournamentGamesCardAction,
  type TournamentGamesCardInput,
  type TournamentPlayedCardInput,
  type TournamentRoundCell,
} from "@repo/domain/tournament-games-card";

const FOCUS_RING =
  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]";

const STEP_ICONS: Record<"playing" | "first" | "next", LucideIcon> = {
  playing: PenLine,
  first: ListOrdered,
  next: ListOrdered,
};

type Tone = {
  dim: string;
  rule: string;
  raised: string;
  hatch: SurfaceTone;
};

const TONES: Record<SurfaceTone, Tone> = {
  ink: {
    dim: "text-dim",
    rule: "border-dimrule",
    raised: "bg-raised",
    hatch: "ink",
  },
  paper: {
    dim: "text-muted-foreground",
    rule: "border-rule",
    raised: "bg-wash",
    hatch: "paper",
  },
};

function actionHref(gameId: string, action: TournamentGamesCardAction) {
  return action.target === "results"
    ? gameHomeIntentHref(gameId, "results")
    : `/dashboard/games/${gameId}`;
}

function TeamPair({ pair, tone }: { pair: MyTournamentPair; tone: Tone }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {[pair.left, pair.right].map((occupant, index) =>
        occupant ? (
          <UserAvatar
            key={occupant.userId}
            name={occupant.name}
            image={occupant.image}
            className={cn(
              "size-[30px] rounded-sm",
              index > 0 && "-ms-1.5",
              "*:data-[slot=avatar-fallback]:text-eyebrow *:data-[slot=avatar-fallback]:rounded-none *:data-[slot=avatar-fallback]:font-semibold",
              occupant.isViewer
                ? "*:data-[slot=avatar-fallback]:bg-ink *:data-[slot=avatar-fallback]:text-paper"
                : cn(
                    "border",
                    tone.rule,
                    tone.raised,
                    "*:data-[slot=avatar-fallback]:bg-transparent",
                  ),
            )}
          />
        ) : (
          <Hatch
            key={`open-${index}`}
            tone={tone.hatch}
            radius="sm"
            className={cn("size-[30px]", index > 0 && "-ms-1.5")}
          />
        ),
      )}
    </span>
  );
}

function resultVariant(cell: TournamentRoundCell) {
  return cell.state === "won" || cell.state === "lost" || cell.state === "draw"
    ? cell.state
    : null;
}

function RoundCell({ cell, tone }: { cell: TournamentRoundCell; tone: Tone }) {
  const result = resultVariant(cell);
  const onCourt = cell.state === "on_court";
  const quiet = cell.state === "later" || cell.state === "no_score";
  return (
    <li
      aria-label={cell.accessibilityLabel}
      className={cn(
        "relative flex min-h-[74px] min-w-0 flex-col overflow-hidden rounded-lg border px-2 py-2",
        onCourt ? "border-current" : tone.rule,
      )}
    >
      {cell.hatched ? (
        <Hatch tone={tone.hatch} className="absolute inset-0" />
      ) : null}
      <span aria-hidden="true" className="relative flex flex-col">
        <span className="flex items-center justify-between gap-1">
          <span className={cn("text-eyebrow", tone.dim)}>{cell.label}</span>
          {result ? (
            <ResultMark variant={result} decorative className="size-3.5" />
          ) : onCourt ? (
            <span className="size-2 rounded-full bg-current" />
          ) : null}
        </span>
        <span
          className={cn(
            "mt-1 break-words font-semibold",
            result ? "text-[17px] tabular-nums leading-tight" : "text-eyebrow",
            !cell.stateLine && "invisible",
          )}
        >
          {cell.stateLine ?? "–"}
        </span>
        {cell.opponentNames.map((name) => (
          <span
            key={name}
            className={cn(
              "text-eyebrow truncate leading-snug",
              result || quiet ? tone.dim : null,
            )}
          >
            {name}
          </span>
        ))}
      </span>
    </li>
  );
}

function RoundCells({
  cells,
  tone,
}: {
  cells: readonly TournamentRoundCell[];
  tone: Tone;
}) {
  return (
    <ul
      className="grid gap-1.5"
      style={{
        gridTemplateColumns: `repeat(${Math.min(Math.max(cells.length, 1), 4)}, minmax(0, 1fr))`,
      }}
    >
      {cells.map((cell) => (
        <RoundCell key={cell.matchId} cell={cell} tone={tone} />
      ))}
    </ul>
  );
}

type UpcomingGame = TournamentGamesCardInput & {
  id: string;
  myTournament: MyTournament;
};

/** One upcoming or live Groups only tournament (ADR-0074). */
export function TournamentGamesCard({
  game,
  lifted,
}: {
  game: UpcomingGame;
  /** The next thing the viewer plays gets the lifted focus surface. */
  lifted: boolean;
}) {
  const locale = useLocale();
  const now = useNow();
  const view = tournamentGamesCardModel(game, now, locale);
  const tone = TONES[lifted ? "ink" : "paper"];
  const StepIcon = view.step ? STEP_ICONS[view.step.kind] : null;
  const spoken = [
    game.name,
    view.formatLabel,
    view.dayLine,
    `${view.time} ${view.meridiem}`.trim(),
    view.status,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li data-slot="tournament-games-card">
      <Surface
        as="article"
        tone={lifted ? "ink" : "paper"}
        radius="card"
        className={cn("p-[18px]", lifted ? null : "border-rule border")}
      >
        <Link
          href={`/dashboard/games/${game.id}`}
          aria-label={spoken}
          className={cn("-m-1 block rounded-lg p-1", FOCUS_RING)}
        >
          <div className="flex items-center gap-1.5">
            {game.sport ? (
              <SportGlyph sport={game.sport} className="size-3.5 shrink-0" />
            ) : null}
            <p className="text-meta min-w-0 flex-1 truncate">
              {view.sportLabel ? (
                <span className="font-semibold">{view.sportLabel}</span>
              ) : null}
              <span className={tone.dim}>{`  ${view.formatLabel}`}</span>
            </p>
            {view.status ? (
              <p className="text-meta shrink-0 font-semibold tabular-nums">
                {view.status}
              </p>
            ) : null}
          </div>
          <p className={cn("text-meta mt-3", tone.dim)}>{view.dayLine}</p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-expanded text-[52px] tabular-nums leading-none">
              {view.time}
            </span>
            {view.meridiem ? (
              <span className="font-expanded text-title leading-none">
                {view.meridiem}
              </span>
            ) : null}
            {view.untilLine ? (
              <span className={cn("text-meta", tone.dim)}>
                {view.untilLine}
              </span>
            ) : null}
          </p>
          {view.venueLine ? (
            <p className="mt-1.5 flex min-w-0 items-center gap-1.5">
              <MapPin
                aria-hidden="true"
                className={cn("size-[15px] shrink-0", tone.dim)}
              />
              <span dir="auto" className="min-w-0 truncate">
                {view.venueLine}
              </span>
            </p>
          ) : null}

          <hr aria-hidden="true" className={cn("my-3.5 border-t", tone.rule)} />

          <div className="flex items-center gap-2.5">
            <TeamPair pair={view.viewerTeam} tone={tone} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {view.teamName}
              </span>
              <span className={cn("text-meta block truncate", tone.dim)}>
                {view.teamLine}
              </span>
            </span>
          </div>

          <div className="mb-2 mt-3.5 flex items-baseline justify-between gap-3">
            <p className="text-meta font-semibold">{view.roundsTitle}</p>
            <p className={cn("text-meta truncate", tone.dim)}>
              {view.roundsMeta}
            </p>
          </div>
          <RoundCells cells={view.cells} tone={tone} />

          {view.step && StepIcon ? (
            <>
              <hr
                aria-hidden="true"
                className={cn("my-3.5 border-t", tone.rule)}
              />
              <div className="flex gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-sm border",
                    tone.rule,
                    tone.raised,
                  )}
                >
                  <StepIcon aria-hidden="true" className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold">{view.step.title}</span>
                  <span className={cn("text-meta", tone.dim)}>
                    {view.step.body}
                  </span>
                </span>
              </div>
            </>
          ) : null}
        </Link>
        <div className="mt-4 flex gap-2">
          <Link
            href={actionHref(game.id, view.secondary)}
            className={cn(
              "flex h-12 min-w-24 items-center justify-center whitespace-nowrap rounded-lg border px-4 font-semibold transition-opacity hover:opacity-85",
              FOCUS_RING,
              tone.rule,
              tone.raised,
            )}
          >
            {view.secondary.label}
          </Link>
          <Link
            href={actionHref(game.id, view.primary)}
            className={cn(
              "bg-ink text-paper flex h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 font-semibold transition-opacity hover:opacity-85",
              FOCUS_RING,
            )}
          >
            {view.scoring ? (
              <PenLine aria-hidden="true" className="size-4" />
            ) : null}
            {view.primary.label}
          </Link>
        </div>
      </Surface>
    </li>
  );
}

type PlayedGame = TournamentPlayedCardInput & {
  id: string;
  myTournament: MyTournament;
};

/** One played Groups only tournament: the place leads, one cell per Round. */
export function TournamentPlayedCard({ game }: { game: PlayedGame }) {
  const locale = useLocale();
  const view = tournamentPlayedCardModel(game, locale);
  const tone = TONES.paper;
  return (
    <li data-slot="tournament-played-card">
      <SummaryCardShell
        href={`/dashboard/games/${game.id}`}
        linkLabel={[view.bandLabel, view.venueLine, view.place, view.summary]
          .filter(Boolean)
          .join(", ")}
      >
        <div className="border-rule pointer-events-none relative z-10 flex items-center justify-between gap-3 border-b px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 font-semibold">
            <Trophy aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{view.bandLabel}</span>
          </span>
          <span className="text-muted-foreground text-meta shrink-0">
            {view.day}
          </span>
        </div>
        <div className="pointer-events-none relative z-10 flex flex-col gap-3 px-4 py-3.5">
          <p className="text-muted-foreground text-meta flex min-w-0 items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span dir="auto" className="truncate">
              {view.venueLine}
            </span>
          </p>
          <div className="flex items-center gap-4">
            {view.place ? (
              <p className="font-expanded shrink-0 text-[44px] leading-none tracking-[-0.035em]">
                {view.place}
              </p>
            ) : null}
            <div
              className={cn(
                "min-w-0",
                view.place && "border-rule border-s ps-4",
              )}
            >
              <p className="font-semibold">{view.context}</p>
              <p className="text-muted-foreground text-meta">{view.summary}</p>
            </div>
          </div>
          <RoundCells cells={view.cells} tone={tone} />
        </div>
        {view.missing ? (
          <div className="border-rule relative z-10 flex items-center justify-between gap-3 border-t px-4 py-3">
            <span className="text-muted-foreground text-meta min-w-0 truncate">
              {view.missing.line}
            </span>
            <Link
              href={actionHref(game.id, view.missing.action)}
              className={cn(
                "text-meta flex shrink-0 items-center gap-1 rounded-sm font-semibold",
                FOCUS_RING,
              )}
            >
              {view.missing.action.label}
              <ArrowRight
                aria-hidden="true"
                className="size-3.5 rtl:-scale-x-100"
              />
            </Link>
          </div>
        ) : null}
      </SummaryCardShell>
    </li>
  );
}
