"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Lock, Plus, UserRoundPlus, Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { LinkedTableRow } from "~/components/common/linked-table-row";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import { NotOnTembaTag, YouTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { groupStandingState } from "@repo/domain/group-join";
import {
  groupStandingEmptyFooter,
  groupStandingOpenSeats,
} from "@repo/domain/group-empty-states";
import {
  formatSeasonRange,
  seasonDisplayName,
  seasonGamesCountedLine,
  seasonLensChips,
  seasonLockedLine,
  seasonProgress,
  seasonProgressLine,
  seasonStartsLine,
  type GroupSeasonData,
  type GroupSeasonStatus,
} from "@repo/domain/group-season";
import type { ResultMarkVariant } from "@repo/domain/result-mark";
import {
  paddedForm,
  standingDiffUnit,
  standingLegend,
  standingRecordLabel,
  standingRulesLine,
  standingShowsDraws,
  unrankedNote,
} from "@repo/domain/season-standing";
import { isRtl } from "@repo/i18n/locale";
import { groupSeasonsHref, playerProfilePath } from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export type StandingEntry = {
  userId: string;
  name: string | null;
  image?: string | null;
  position: number | null;
  ranked: boolean;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  form: ResultMarkVariant[];
  isViewer: boolean;
  unclaimed: boolean;
};

export type StandingSeason = GroupSeasonData & { status: GroupSeasonStatus };

/**
 * Column geometry from design "Seasons" 1a: 40px position, flexible Player,
 * four 30px count columns and a 44px PTS column. The outer columns carry the
 * card's gutter inside their width so `table-fixed` lands the rule-to-rule
 * widths the design draws.
 */
const COL_POSITION = "w-[52px] ps-4 pe-0 text-start";
const COL_PLAYER = "px-0 text-start";
const COL_COUNT = "w-[30px] px-0 text-center";
const COL_POINTS = "w-[56px] ps-0 pe-4 text-end";
const HEAD_CELL = "py-3 font-normal";
const BODY_CELL = "py-3";

function FormStrip({
  form,
  decorative = true,
}: {
  form: readonly ResultMarkVariant[];
  decorative?: boolean;
}) {
  return (
    <span className="mt-1 flex gap-[3px]" aria-hidden={decorative || undefined}>
      {paddedForm(form).map((mark, index) => (
        <ResultMark key={index} variant={mark} decorative className="size-3" />
      ))}
    </span>
  );
}

function PlayerCell({
  entry,
  linkToPlayers,
  muted = false,
}: {
  entry: StandingEntry;
  linkToPlayers: boolean;
  muted?: boolean;
}) {
  const m = useMessages();
  const name = entry.name ?? m.community.memberFallback;
  const label = (
    <span
      dir="auto"
      className={cn(
        "text-body block min-w-0 truncate",
        entry.isViewer && "font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      {name}
    </span>
  );
  return (
    <span className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-1.5">
        {linkToPlayers ? (
          <Link
            href={playerProfilePath(entry.userId)}
            className="block min-w-0 truncate outline-none focus-visible:underline"
          >
            {label}
          </Link>
        ) : (
          label
        )}
        {entry.isViewer ? <YouTag /> : null}
        {entry.unclaimed ? <NotOnTembaTag /> : null}
      </span>
      <FormStrip form={entry.form} />
    </span>
  );
}

function CountCells({
  entry,
  muted,
  showDraws,
}: {
  entry: StandingEntry;
  muted: boolean;
  showDraws: boolean;
}) {
  const count = cn(
    COL_COUNT,
    BODY_CELL,
    "text-body tabular-nums",
    muted ? "text-muted-foreground" : "text-dim",
  );
  return (
    <>
      <td className={count}>{entry.played}</td>
      <td className={count}>{entry.wins}</td>
      {showDraws ? <td className={count}>{entry.draws}</td> : null}
      <td className={count}>{entry.losses}</td>
      <td
        className={cn(
          COL_POINTS,
          BODY_CELL,
          "font-expanded text-[18px] tabular-nums",
          muted && "text-muted-foreground",
        )}
      >
        {entry.points}
      </td>
    </>
  );
}

function StandingRow({
  entry,
  linkToPlayers,
  showDraws,
}: {
  entry: StandingEntry;
  linkToPlayers: boolean;
  showDraws: boolean;
}) {
  const href = linkToPlayers ? playerProfilePath(entry.userId) : undefined;
  const className = cn(
    "border-rule border-t",
    entry.isViewer && "bg-wash",
    href && "hover:bg-wash",
  );
  const cells = (
    <>
      <td className={cn(COL_POSITION, BODY_CELL)}>
        {entry.ranked ? (
          <span className="font-expanded block text-[20px] tabular-nums">
            {entry.position}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="hatch block size-[22px] rounded-[6px]"
          />
        )}
      </td>
      <td className={cn(COL_PLAYER, BODY_CELL)}>
        <PlayerCell
          entry={entry}
          linkToPlayers={linkToPlayers}
          muted={!entry.ranked}
        />
      </td>
      <CountCells entry={entry} muted={!entry.ranked} showDraws={showDraws} />
    </>
  );
  return href ? (
    <LinkedTableRow href={href} className={className}>
      {cells}
    </LinkedTableRow>
  ) : (
    <tr className={className}>{cells}</tr>
  );
}

/** Design 1b: before the Season's first result every cell is hatched. */
function NotPlayedRow({
  entry,
  linkToPlayers,
  showDraws,
}: {
  entry: StandingEntry;
  linkToPlayers: boolean;
  showDraws: boolean;
}) {
  const hatched = (
    <span
      aria-hidden="true"
      className="hatch mx-auto block size-3.5 rounded-[4px]"
    />
  );
  return (
    <tr className="border-rule border-t">
      <td className={cn(COL_POSITION, BODY_CELL)}>
        <span
          aria-hidden="true"
          className="hatch block size-[22px] rounded-[6px]"
        />
      </td>
      <td className={cn(COL_PLAYER, BODY_CELL)}>
        <PlayerCell entry={entry} linkToPlayers={linkToPlayers} muted />
      </td>
      <td className={cn(COL_COUNT, BODY_CELL)}>{hatched}</td>
      <td className={cn(COL_COUNT, BODY_CELL)}>{hatched}</td>
      {showDraws ? (
        <td className={cn(COL_COUNT, BODY_CELL)}>{hatched}</td>
      ) : null}
      <td className={cn(COL_COUNT, BODY_CELL)}>{hatched}</td>
      <td className={cn(COL_POINTS, BODY_CELL)}>
        <span
          aria-hidden="true"
          className="hatch ms-auto block size-3.5 rounded-[4px]"
        />
      </td>
    </tr>
  );
}

function StandingTable({
  rows,
  linkToPlayers,
  notPlayedYet,
  showDraws,
  legend,
  footer,
}: {
  rows: StandingEntry[];
  linkToPlayers: boolean;
  /** The lens has no result yet: rows hatch instead of counting. */
  notPlayedYet: boolean;
  showDraws: boolean;
  legend: string;
  footer: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const columns = m.webGroup.standing;
  const ranked = rows.filter((row) => row.ranked);
  const unranked = rows.filter((row) => !row.ranked);
  const head = cn(HEAD_CELL, "text-eyebrow text-muted-foreground");
  return (
    <div className={cardFrame}>
      <table className="w-full table-fixed">
        <thead className="bg-wash">
          <tr>
            <th scope="col" className={cn(COL_POSITION, head)}>
              <span className="sr-only">{columns.position}</span>
            </th>
            <th scope="col" className={cn(COL_PLAYER, head)}>
              {columns.player}
            </th>
            <th
              scope="col"
              title={columns.played}
              className={cn(COL_COUNT, head)}
            >
              {columns.playedAbbrev}
            </th>
            <th scope="col" title={columns.won} className={cn(COL_COUNT, head)}>
              {columns.wonAbbrev}
            </th>
            {showDraws ? (
              <th
                scope="col"
                title={columns.drawn}
                className={cn(COL_COUNT, head)}
              >
                {columns.drawnAbbrev}
              </th>
            ) : null}
            <th
              scope="col"
              title={columns.lost}
              className={cn(COL_COUNT, head)}
            >
              {columns.lostAbbrev}
            </th>
            <th
              scope="col"
              title={columns.points}
              className={cn(
                COL_POINTS,
                HEAD_CELL,
                "text-eyebrow text-ink font-semibold",
              )}
            >
              {columns.pointsAbbrev}
            </th>
          </tr>
        </thead>
        <tbody>
          {notPlayedYet
            ? rows.map((entry) => (
                <NotPlayedRow
                  key={entry.userId}
                  entry={entry}
                  linkToPlayers={linkToPlayers}
                  showDraws={showDraws}
                />
              ))
            : null}
          {notPlayedYet
            ? null
            : ranked.map((entry) => (
                <StandingRow
                  key={entry.userId}
                  entry={entry}
                  linkToPlayers={linkToPlayers}
                  showDraws={showDraws}
                />
              ))}
          {!notPlayedYet && unranked.length > 0 ? (
            <tr className="border-rule bg-wash border-t">
              <td
                colSpan={showDraws ? 7 : 6}
                className="text-eyebrow text-muted-foreground px-4 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.06em]">
                    {columns.unranked}
                  </span>
                  <span>{unrankedNote(locale)}</span>
                </div>
              </td>
            </tr>
          ) : null}
          {!notPlayedYet
            ? unranked.map((entry) => (
                <StandingRow
                  key={entry.userId}
                  entry={entry}
                  linkToPlayers={linkToPlayers}
                  showDraws={showDraws}
                />
              ))
            : null}
        </tbody>
      </table>
      <div className="border-rule text-meta flex flex-col gap-1.5 border-t px-4 py-3.5">
        <p>{legend}</p>
        <p className="text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

/** Design 1c: the closed Season's top three, locked at close. */
function Podium({
  rows,
  season,
}: {
  rows: StandingEntry[];
  season: StandingSeason;
}) {
  const m = useMessages();
  const locale = useLocale();
  const top = rows.filter((row) => row.ranked).slice(0, 3);
  if (top.length === 0) {
    return null;
  }
  return (
    <section
      aria-label={m.webGroup.standing.finalTopThree}
      className="border-ink rounded-card overflow-hidden border-[1.5px]"
    >
      <ol>
        {top.map((entry) => (
          <li
            key={entry.userId}
            className={cn(
              "border-rule flex items-center gap-3.5 border-t px-4 py-3 first:border-t-0",
              entry.isViewer && "bg-wash",
            )}
          >
            <span className="font-expanded w-8 text-[28px] tabular-nums leading-none">
              {entry.position}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                dir="auto"
                className={cn(
                  "text-body truncate",
                  entry.isViewer && "font-semibold",
                )}
              >
                {entry.name ?? m.community.memberFallback}
              </span>
              {entry.isViewer ? <YouTag /> : null}
            </span>
            <span className="text-meta text-muted-foreground tabular-nums">
              {standingRecordLabel(entry)}
            </span>
            <span className="font-expanded text-[18px] tabular-nums">
              {entry.points}
              <span className="text-eyebrow text-muted-foreground ms-0.5 font-normal tracking-normal">
                {m.webGroup.standing.ptsSuffix}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="border-rule text-eyebrow text-muted-foreground flex items-center justify-between border-t px-4 py-2.5">
        <span>{seasonLockedLine(season, locale)}</span>
        <Lock aria-hidden="true" className="size-3.5" />
      </p>
    </section>
  );
}

function SeasonHeader({
  season,
  gamesCounted,
  now,
}: {
  season: StandingSeason;
  gamesCounted: number;
  now: Date;
}) {
  const m = useMessages();
  const locale = useLocale();
  const title = (
    <h2
      className={cn(
        "font-expanded text-display leading-none tracking-[-0.03em]",
        !isRtl(locale) && "uppercase",
      )}
    >
      {seasonDisplayName(season.name, locale)}
    </h2>
  );
  const range = (
    <span className="text-meta text-muted-foreground shrink-0 tabular-nums">
      {formatSeasonRange(season, locale)}
    </span>
  );

  if (season.status === "upcoming") {
    return (
      <Surface tone="ink" radius="card" className="px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          {title}
          <span className="text-meta text-paper/70 shrink-0 tabular-nums">
            {formatSeasonRange(season, locale)}
          </span>
        </div>
        <p className="text-body mt-2">{seasonStartsLine(season, locale)}</p>
      </Surface>
    );
  }

  if (season.status === "closed") {
    return (
      <div className={cn(cardFrame, "px-5 py-4")}>
        <div className="flex items-end justify-between gap-3">
          {title}
          {range}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="border-ink text-eyebrow rounded-[4px] border px-1.5 py-px font-semibold uppercase tracking-[0.06em]">
            {m.webGroup.standing.final}
          </span>
          <span className="text-eyebrow text-muted-foreground tabular-nums">
            {seasonGamesCountedLine(gamesCounted, locale)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        {title}
        {range}
      </div>
      <div
        role="progressbar"
        aria-label={m.webGroup.standing.seasonProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(seasonProgress(season, now) * 100)}
        className="bg-rule mt-3 h-[3px] w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-ink h-full rounded-full"
          style={{ width: `${Math.round(seasonProgress(season, now) * 100)}%` }}
        />
      </div>
      <div className="text-eyebrow text-muted-foreground mt-2 flex items-center justify-between tabular-nums">
        <span>{seasonProgressLine(season, now, locale)}</span>
        <span>{seasonGamesCountedLine(gamesCounted, locale)}</span>
      </div>
    </div>
  );
}

function LensChips({
  seasons,
  lensId,
  now,
  onPick,
}: {
  seasons: StandingSeason[];
  lensId: string | null;
  now: Date;
  onPick: (seasonId: string | null) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <div
      role="tablist"
      aria-label={m.webGroup.standing.seasonLens}
      className="border-rule -mx-1 flex gap-1 overflow-x-auto border-b px-1"
    >
      {seasonLensChips(seasons, now, locale).map((chip) => {
        const selected = chip.seasonId === lensId;
        return (
          <button
            key={chip.seasonId ?? "all-time"}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onPick(chip.seasonId)}
            className={cn(
              "text-body -mb-px shrink-0 border-b-2 px-2 py-2.5 outline-none focus-visible:underline",
              selected
                ? "border-ink text-ink font-semibold"
                : "text-muted-foreground border-transparent",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

const PREVIEW_ROW =
  "grid min-h-14 grid-cols-[28px_1fr_auto] items-center gap-3";

/**
 * Design "Group empty states" 01: before the first result the Standing draws
 * every member at 0 points and pads to four rows with open seats to invite into.
 */
function StandingPreview({
  leaderboard,
  linkToPlayers,
  canInvite,
  onInvite,
}: {
  leaderboard: StandingEntry[];
  linkToPlayers: boolean;
  canInvite: boolean;
  onInvite: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <div className={cardFrame}>
      <div
        className={cn(
          PREVIEW_ROW,
          "border-rule text-muted-foreground text-eyebrow min-h-0 border-b px-[18px] py-3",
        )}
      >
        <span>#</span>
        <span>{m.webGroup.standing.player}</span>
        <span>{m.webGroup.standing.pointsAbbrev}</span>
      </div>
      <ol>
        {leaderboard.map((entry, index) => {
          const name = entry.isViewer
            ? m.common.you
            : (entry.name ?? m.community.memberFallback);
          return (
            <li
              key={entry.userId}
              className={cn(
                PREVIEW_ROW,
                "border-rule border-t px-[18px] first:border-t-0",
                entry.isViewer && "bg-ink text-paper",
                linkToPlayers && "relative",
              )}
            >
              <span className="font-expanded text-lead">{index + 1}</span>
              <span className="flex min-w-0 items-center gap-2.5">
                <UserAvatar
                  name={entry.name ?? m.community.memberFallback}
                  image={entry.image}
                  className={cn(
                    "size-7 rounded-lg [&_[data-slot=avatar-fallback]]:rounded-none [&_[data-slot=avatar-fallback]]:text-[11px] [&_[data-slot=avatar-fallback]]:font-semibold",
                    entry.isViewer &&
                      "[&_[data-slot=avatar-fallback]]:bg-paper [&_[data-slot=avatar-fallback]]:text-ink",
                  )}
                />
                {linkToPlayers ? (
                  <Link
                    href={playerProfilePath(entry.userId)}
                    dir="auto"
                    className={cn(
                      "text-body block min-w-0 truncate after:absolute after:inset-0",
                      entry.isViewer && "font-semibold",
                    )}
                  >
                    {name}
                  </Link>
                ) : (
                  <span
                    dir="auto"
                    className={cn(
                      "text-body block min-w-0 truncate",
                      entry.isViewer && "font-semibold",
                    )}
                  >
                    {name}
                  </span>
                )}
                {entry.unclaimed ? <NotOnTembaTag /> : null}
              </span>
              <span className="font-expanded text-body tabular-nums">
                {entry.points}
              </span>
            </li>
          );
        })}
        {groupStandingOpenSeats(leaderboard.length).map((position) => (
          <li
            key={position}
            className={cn(
              PREVIEW_ROW,
              "border-rule border-t ps-[18px]",
              canInvite ? "pe-2.5" : "pe-[18px]",
            )}
          >
            <span className="font-expanded text-lead text-muted-foreground/40">
              {position}
            </span>
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="hatch size-7 shrink-0 rounded-lg"
              />
              <span className="text-body text-muted-foreground">
                {m.webGroup.standing.openSeat}
              </span>
            </span>
            {canInvite ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onInvite}
                aria-label={m.invite.door.invitePlayers}
                className="font-semibold"
              >
                <Plus aria-hidden="true" />
                {m.invite.door.inviteButton}
              </Button>
            ) : (
              <span />
            )}
          </li>
        ))}
      </ol>
      <p className="border-rule text-meta text-muted-foreground border-t px-[18px] py-3.5">
        {groupStandingEmptyFooter(leaderboard.length, locale)}
      </p>
    </div>
  );
}

function StatPair({
  totalGamesPlayed,
  awaitingScoreCount,
  muted = false,
}: {
  totalGamesPlayed: number;
  awaitingScoreCount: number;
  muted?: boolean;
}) {
  const m = useMessages();
  const value = cn(
    "font-expanded text-[26px] tabular-nums leading-8",
    muted && "text-muted-foreground/40",
  );
  return (
    <div className={cn(cardFrame, "flex")}>
      <div className="border-rule min-w-0 flex-1 border-e px-5 py-[18px]">
        <p className={value}>{totalGamesPlayed}</p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">
          {m.webGroup.standing.gamesPlayed}
        </p>
      </div>
      <div className="min-w-0 flex-1 px-5 py-[18px]">
        <p className={value}>{awaitingScoreCount}</p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">
          {m.webGroup.standing.awaitingScore}
        </p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy="true" className={cn(cardFrame, "flex flex-col gap-px p-4")}>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

function ManageSeasonsLink({
  groupId,
  hasSeasons,
}: {
  groupId: string;
  hasSeasons: boolean;
}) {
  const m = useMessages();
  return (
    <Button asChild variant="outline" className="w-full font-semibold">
      <Link href={groupSeasonsHref(groupId)}>
        {hasSeasons
          ? m.webGroup.standing.manageSeasons
          : m.webGroup.standing.setUpSeasons}
      </Link>
    </Button>
  );
}

export function GroupStandingTab({
  isMember,
  linkToPlayers,
  leaderboard,
  seasons,
  defaultSeasonId,
  gamesCounted,
  sport,
  groupId,
  canShowCreateGame,
  hasGames,
  totalGamesPlayed,
  awaitingScoreCount,
  canInvite = false,
  onInvite,
  canManageSeasons = false,
  now = new Date(),
}: {
  canInvite?: boolean;
  onInvite?: () => void;
  isMember: boolean;
  linkToPlayers: boolean;
  /** The default lens: the active Season, else the next, else all-time. */
  leaderboard: StandingEntry[];
  seasons: StandingSeason[];
  defaultSeasonId: string | null;
  gamesCounted: number;
  sport: string | null;
  groupId: string;
  canShowCreateGame: boolean;
  hasGames: boolean;
  totalGamesPlayed: number;
  awaitingScoreCount: number;
  canManageSeasons?: boolean;
  now?: Date;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [lensId, setLensId] = useState<string | null>(defaultSeasonId);
  const lensIsDefault = lensId === defaultSeasonId;
  const lens = api.groups.seasonStanding.useQuery(
    { groupId, seasonId: lensId },
    { enabled: isMember && !lensIsDefault },
  );
  const rows: StandingEntry[] = lensIsDefault
    ? leaderboard
    : (lens.data?.rows ?? []);
  const counted = lensIsDefault ? gamesCounted : (lens.data?.gamesCounted ?? 0);
  const season = seasons.find((row) => row.id === lensId) ?? null;
  const footer = standingRulesLine(standingDiffUnit(sport), locale);
  const showDraws = standingShowsDraws(sport, rows);

  const state = groupStandingState({
    isMember,
    hasGames,
    leaderboard,
  });
  if (state.kind === "not-member") {
    return (
      <EmptyState
        icon={Users}
        title={m.webGroup.standing.joinTitle}
        description={m.webGroup.standing.joinDescription}
      />
    );
  }

  const showCreateFirstGame = canShowCreateGame && state.showCreateFirstGame;
  const manageSeasons = canManageSeasons ? (
    <ManageSeasonsLink groupId={groupId} hasSeasons={seasons.length > 0} />
  ) : null;

  if (seasons.length === 0 && state.showNoResultsNotice && state.showTable) {
    const invite = canInvite && onInvite ? onInvite : null;
    return (
      <div className="flex flex-col gap-[22px]">
        <StandingPreview
          leaderboard={leaderboard}
          linkToPlayers={linkToPlayers}
          canInvite={invite != null}
          onInvite={() => invite?.()}
        />
        {invite || showCreateFirstGame ? (
          <div className="flex flex-col gap-2">
            {invite ? (
              <Button
                type="button"
                size="lg"
                className="text-body w-full font-semibold"
                onClick={invite}
              >
                <UserRoundPlus aria-hidden="true" />
                {m.invite.door.invitePlayers}
              </Button>
            ) : null}
            {showCreateFirstGame ? (
              <Button
                asChild
                size="lg"
                variant={invite ? "outline" : "default"}
                className="text-body w-full font-semibold"
              >
                <Link href={`/dashboard/games/new?groupId=${groupId}`}>
                  {m.webGroup.games.createFirst}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        <StatPair
          totalGamesPlayed={totalGamesPlayed}
          awaitingScoreCount={awaitingScoreCount}
          muted
        />
        {manageSeasons}
      </div>
    );
  }

  let table: ReactNode;
  if (!lensIsDefault && lens.isLoading) {
    table = <TableSkeleton />;
  } else if (!lensIsDefault && lens.error) {
    table = (
      <EmptyState
        icon={Users}
        title={m.webGroup.standing.errorTitle}
        description={lens.error.message}
      />
    );
  } else if (rows.length === 0) {
    table = (
      <EmptyState
        icon={Users}
        title={m.webGroup.standing.afterFirstResultTitle}
        action={
          showCreateFirstGame ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/games/new?groupId=${groupId}`}>
                {m.webGroup.games.createFirst}
              </Link>
            </Button>
          ) : null
        }
      />
    );
  } else {
    table = (
      <StandingTable
        rows={rows}
        linkToPlayers={linkToPlayers}
        notPlayedYet={counted === 0}
        showDraws={showDraws}
        legend={standingLegend(showDraws, locale)}
        footer={footer}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {season ? (
        <SeasonHeader season={season} gamesCounted={counted} now={now} />
      ) : null}
      {seasons.length > 0 ? (
        <LensChips
          seasons={seasons}
          lensId={lensId}
          now={now}
          onPick={setLensId}
        />
      ) : null}
      {season?.status === "closed" && !lens.isLoading ? (
        <Podium rows={rows} season={season} />
      ) : null}
      {table}
      {seasons.length === 0 ? (
        <StatPair
          totalGamesPlayed={totalGamesPlayed}
          awaitingScoreCount={awaitingScoreCount}
        />
      ) : null}
      {manageSeasons}
    </div>
  );
}
