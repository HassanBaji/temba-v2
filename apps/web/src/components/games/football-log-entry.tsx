"use client";

import { shortName, type BoardPlayer } from "@repo/domain/football-board";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  LOG_MODES,
  kindKey,
  logLineName,
  logLineSub,
  newestFirst,
  playerMarks,
  removedLabel,
  runningScores,
  type MatchLogLine,
} from "@repo/domain/football-match-log";
import { Plus, X } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

import { CardMark, LogGlyph, scoreDash } from "./football-log-parts";
import { sideMembers } from "./football-team-columns";
import { type MatchLogEditor } from "./use-match-log-editor";

type Names = { slot1: string; slot2: string };

function LogChip({
  player,
  team,
  lines,
  onTap,
}: {
  player: BoardPlayer;
  team: string;
  lines: readonly MatchLogLine[];
  onTap: () => void;
}) {
  const m = useMessages();
  const t = m.football.matchLog;
  const marks = playerMarks(lines, player.userId);
  const name = player.isViewer ? m.common.you : shortName(player.name);
  const spoken = [
    t.playerOfTeam(player.name, team),
    marks.goals > 0 ? t.chip.goals(marks.goals) : null,
    marks.warnings > 0 ? t.chip.warned : null,
    marks.sentOff ? t.chip.sentOff : null,
  ]
    .filter(Boolean)
    .join(". ");
  return (
    <li>
      <button
        type="button"
        aria-label={spoken}
        onClick={onTap}
        className={cn(
          "border-rule bg-paper focus-visible:ring-ring/50 flex h-10 items-center gap-[7px] rounded-full border pe-3 ps-[5px] outline-none focus-visible:ring-[3px]",
          marks.sentOff && "text-muted-foreground",
        )}
      >
        <UserAvatar
          name={player.name}
          image={player.image}
          size="sm"
          guest={player.guest === true}
          className={cn(marks.sentOff && "opacity-50")}
        />
        <span className="text-meta whitespace-nowrap font-semibold">
          {name}
        </span>
        <span className="text-muted-foreground text-[12px]">{team}</span>
        {marks.goals > 0 ? (
          <span className="bg-control text-on-control flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums">
            {marks.goals}
          </span>
        ) : null}
        {marks.warnings > 0 ? <CardMark kind="warning" /> : null}
        {marks.sentOff ? <CardMark kind="red_card" /> : null}
      </button>
    </li>
  );
}

/** One choice above the names says what the next tap records. */
export function WhatHappened({
  players,
  names,
  editor,
  onRedCard,
}: {
  players: readonly BoardPlayer[];
  names: Names;
  editor: MatchLogEditor;
  onRedCard: (player: BoardPlayer) => void;
}) {
  const t = useMessages().football.matchLog;
  const lines = editor.lines ?? [];
  const modeKey = kindKey(editor.mode);
  const everyone = [...sideMembers(players, 1), ...sideMembers(players, 2)];
  return (
    <section
      aria-labelledby="what-happened-heading"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <div className="border-rule flex items-baseline justify-between gap-2.5 border-b px-5 py-3.5">
        <h2 id="what-happened-heading" className="text-muted-foreground">
          {t.whatHappened}
        </h2>
        <span
          aria-live="polite"
          className="text-muted-foreground text-end text-[12px]"
        >
          {t.hints[modeKey]}
        </span>
      </div>
      <RovingRadioGroup
        aria-label={t.whatHappened}
        className="grid grid-cols-4 gap-1.5 px-3.5 pt-3.5"
      >
        {LOG_MODES.map((mode) => {
          const selected = mode.kind === editor.mode;
          return (
            <button
              key={mode.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => editor.setMode(mode.kind)}
              className={cn(
                "focus-visible:ring-ring/50 flex h-[46px] flex-col items-center justify-center gap-1 rounded-xl border text-[12px] font-semibold outline-none focus-visible:ring-[3px]",
                selected
                  ? "bg-control text-on-control border-ink [&_.bg-ink]:bg-on-control"
                  : "bg-paper border-rule",
              )}
            >
              <LogGlyph
                kind={mode.kind}
                className={
                  mode.kind === "goal"
                    ? "size-2.5"
                    : mode.kind === "own_goal"
                      ? "size-3"
                      : undefined
                }
              />
              {t.modes[mode.key]}
            </button>
          );
        })}
      </RovingRadioGroup>
      <ul className="flex flex-wrap gap-[7px] p-3.5">
        {everyone.map((player) => (
          <LogChip
            key={player.userId}
            player={player}
            team={player.sideIndex === 1 ? names.slot1 : names.slot2}
            lines={lines}
            onTap={() =>
              editor.mode === "red_card"
                ? onRedCard(player)
                : editor.tapPlayer(player)
            }
          />
        ))}
      </ul>
      <p className="border-rule text-muted-foreground border-t px-5 py-3 text-[12px] leading-normal">
        {t.entryNote}
      </p>
    </section>
  );
}

/** Every line with its minute and clock time, newest first; the cross takes one out. */
export function MatchLogList({
  players,
  names,
  editor,
  onOpenLine,
}: {
  players: readonly BoardPlayer[];
  names: Names;
  editor: MatchLogEditor;
  onOpenLine: (id: string) => void;
}) {
  const locale = useLocale();
  const t = useMessages().football.matchLog;
  const lines = editor.lines ?? [];
  const scores = runningScores(lines);
  const firstRemoved = editor.removed[0];
  return (
    <section
      aria-labelledby="match-log-heading"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <div className="flex items-baseline justify-between px-5 py-3.5">
        <h2 id="match-log-heading" className="text-muted-foreground">
          {t.title}
        </h2>
        <span className="text-muted-foreground text-[12px]">
          {t.lineCount(lines.length)}
        </span>
      </div>
      {firstRemoved ? (
        <div
          role="status"
          className="border-rule bg-wash flex items-center gap-2.5 border-t py-2.5 pe-3 ps-4"
        >
          <span className="text-meta min-w-0 flex-1">
            {removedLabel(
              firstRemoved,
              firstRemoved.userId
                ? logLineName(firstRemoved, players, locale)
                : null,
              names,
              locale,
            )}
          </span>
          <Button type="button" size="sm" onClick={editor.undo}>
            {t.undo}
          </Button>
        </div>
      ) : null}
      {lines.length === 0 ? (
        <div className="border-rule relative flex justify-center border-t px-5 py-[22px]">
          <Hatch className="absolute inset-0" />
          <span className="bg-paper text-muted-foreground text-meta relative rounded-md px-2 py-0.5">
            {t.empty}
          </span>
        </div>
      ) : (
        <ol>
          {newestFirst(lines).map((line) => {
            const name = logLineName(line, players, locale);
            const sub = logLineSub(line, names, locale);
            const score = scores.get(line.id);
            const what = `${t.minute(line.minute)} ${name}, ${sub}`;
            return (
              <li
                key={line.id}
                className="border-rule border-t py-[11px] pe-3 ps-4"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={t.editLine(what)}
                    onClick={() => onOpenLine(line.id)}
                    className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-md text-start outline-none focus-visible:ring-[3px]"
                  >
                    <span className="w-[54px] flex-none">
                      <span className="font-expanded block text-[17px] tabular-nums">
                        {t.minute(line.minute)}
                      </span>
                      <span className="text-muted-foreground block whitespace-nowrap text-[11px]">
                        {formatGameClock(line.loggedAt, locale)}
                      </span>
                    </span>
                    <span className="flex w-[18px] flex-none justify-center">
                      <LogGlyph kind={line.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-meta block font-semibold">
                        {name}
                      </span>
                      <span className="text-muted-foreground block text-[12px] leading-snug">
                        {sub}
                      </span>
                    </span>
                    {score ? (
                      <span className="font-expanded flex-none text-[15px] tabular-nums">
                        {scoreDash(score)}
                      </span>
                    ) : null}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t.removeLine(what)}
                    onClick={() => editor.remove(line.id)}
                    className="size-[34px] flex-none"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
                {line.kind === "goal" && !line.userId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenLine(line.id)}
                    className="ms-[96px] mt-1.5"
                  >
                    <Plus aria-hidden="true" />
                    {t.addScorer}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      <p className="border-rule text-muted-foreground border-t px-5 py-3 text-[12px] leading-normal">
        {t.logNote}
      </p>
    </section>
  );
}
