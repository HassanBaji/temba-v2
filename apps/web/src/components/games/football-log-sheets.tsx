"use client";

import {
  ofSide,
  shortName,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  RED_CARD_REASONS,
  isGoalLine,
  logLineSub,
  otherSide,
  type MatchLogLine,
  type RedCardReason,
} from "@repo/domain/football-match-log";
import { Minus, Plus } from "lucide-react";
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { CardShape } from "./football-log-parts";
import { sideMembers } from "./football-team-columns";
import { type MatchLogEditor } from "./use-match-log-editor";

type Names = { slot1: string; slot2: string };

function ReasonChips({
  value,
  onChange,
}: {
  value: RedCardReason | null;
  onChange: (reason: RedCardReason | null) => void;
}) {
  const t = useMessages().football.matchLog;
  return (
    <div className="space-y-2.5">
      <p className="text-muted-foreground text-meta">{t.redSheet.why}</p>
      <div className="flex flex-wrap gap-1.5">
        {RED_CARD_REASONS.map((reason) => {
          const picked = reason === value;
          return (
            <button
              key={reason}
              type="button"
              aria-pressed={picked}
              onClick={() => onChange(picked ? null : reason)}
              className={cn(
                "text-meta focus-visible:ring-ring/50 h-[38px] rounded-[10px] border px-3.5 outline-none focus-visible:ring-[3px]",
                picked
                  ? "bg-control text-on-control border-ink"
                  : "bg-wash border-rule",
              )}
            >
              {t.reasons[reason]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlayerPicks({
  label,
  players,
  selectedUserId,
  onPick,
}: {
  label: string;
  players: readonly BoardPlayer[];
  selectedUserId: string | null;
  onPick: (player: BoardPlayer) => void;
}) {
  const m = useMessages();
  if (players.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2.5">
      <p className="text-muted-foreground text-meta">{label}</p>
      <ul className="flex flex-wrap gap-[7px]">
        {players.map((player) => {
          const picked = player.userId === selectedUserId;
          return (
            <li key={player.userId}>
              <button
                type="button"
                aria-pressed={picked}
                onClick={() => onPick(player)}
                className={cn(
                  "focus-visible:ring-ring/50 flex h-10 items-center gap-[7px] rounded-full border pe-3 ps-[5px] outline-none focus-visible:ring-[3px]",
                  picked
                    ? "bg-control text-on-control border-ink"
                    : "bg-wash border-rule",
                )}
              >
                <UserAvatar
                  name={player.name}
                  image={player.image}
                  size="sm"
                  guest={player.guest === true}
                />
                <span className="text-meta whitespace-nowrap font-semibold">
                  {player.isViewer ? m.common.you : shortName(player.name)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The one step that asks first: who is sent off, and why if anyone says. */
export function RedCardSheet({
  player,
  names,
  onCancel,
  onGive,
}: {
  player: BoardPlayer | null;
  names: Names;
  onCancel: () => void;
  onGive: (reason: RedCardReason | null) => void;
}) {
  const m = useMessages();
  const t = m.football.matchLog;
  const [reason, setReason] = React.useState<RedCardReason | null>(null);

  React.useEffect(() => {
    setReason(null);
  }, [player?.userId]);

  const who = player
    ? t.playerOfTeam(
        player.isViewer ? m.common.you : shortName(player.name),
        ofSide(names, player.sideIndex ?? 1),
      )
    : "";
  return (
    <ResponsiveDialog
      open={player != null}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <ResponsiveDialogContent showCloseButton={false}>
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3.5">
            <CardShape
              kind="red_card"
              className="h-[42px] w-[30px] rounded-[5px]"
            />
            <div className="min-w-0">
              <ResponsiveDialogTitle className="font-expanded text-[28px] leading-none">
                {t.redSheet.title}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="mt-1.5">
                {who}
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>
        <div className="space-y-4 px-4 sm:px-0">
          <ReasonChips value={reason} onChange={setReason} />
          <p className="text-muted-foreground text-meta">{t.redSheet.note}</p>
        </div>
        <ResponsiveDialogFooter className="grid grid-cols-[1fr_1.4fr] gap-2">
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button type="button" size="lg" onClick={() => onGive(reason)}>
            {t.redSheet.give}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * Changes one line: who it is about (on a goal, a player of the other side
 * makes it an own goal), its minute, and a red card's reason. The line keeps
 * its time and its place.
 */
export function LogLineSheet({
  line,
  players,
  names,
  editor,
  onClose,
}: {
  line: MatchLogLine | null;
  players: readonly BoardPlayer[];
  names: Names;
  editor: MatchLogEditor;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useMessages().football.matchLog;
  const goal = line ? isGoalLine(line) : false;

  let title = t.editSheet.title;
  let description = "";
  let picks: React.ReactNode = null;
  if (line) {
    const pick = (player: BoardPlayer) => editor.changePlayer(line.id, player);
    if (goal) {
      title = t.scorerSheet.title;
      description = t.scorerSheet.what(
        ofSide(names, line.side),
        line.minute,
        formatGameClock(line.loggedAt, locale),
      );
      picks = (
        <>
          <PlayerPicks
            label={ofSide(names, line.side)}
            players={sideMembers(players, line.side)}
            selectedUserId={line.kind === "goal" ? line.userId : null}
            onPick={pick}
          />
          <PlayerPicks
            label={t.scorerSheet.ownGoalBy(ofSide(names, otherSide(line.side)))}
            players={sideMembers(players, otherSide(line.side))}
            selectedUserId={line.kind === "own_goal" ? line.userId : null}
            onPick={pick}
          />
        </>
      );
    } else {
      description = logLineSub(line, names, locale);
      picks = ([1, 2] as const).map((side) => (
        <PlayerPicks
          key={side}
          label={ofSide(names, side)}
          players={sideMembers(players, side)}
          selectedUserId={line.userId}
          onPick={pick}
        />
      ));
    }
  }

  return (
    <ResponsiveDialog
      open={line != null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent showCloseButton={false}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-expanded text-[28px] leading-none">
            {title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {line ? (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto px-4 sm:px-0">
            {picks}
            {line.kind === "red_card" ? (
              <ReasonChips
                value={line.reason}
                onChange={(reason) => editor.changeReason(line.id, reason)}
              />
            ) : null}
            <div className="space-y-2.5">
              <p className="text-muted-foreground text-meta">
                {t.editSheet.minuteLabel}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t.editSheet.earlier}
                  onClick={() => editor.changeMinute(line.id, line.minute - 1)}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <output
                  aria-live="polite"
                  aria-label={t.minuteSpoken(line.minute)}
                  className="font-expanded min-w-16 text-center text-[28px] tabular-nums"
                >
                  {t.minute(line.minute)}
                </output>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t.editSheet.later}
                  onClick={() => editor.changeMinute(line.id, line.minute + 1)}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>
            {goal ? (
              <p className="text-muted-foreground text-meta">
                {t.scorerSheet.note}
              </p>
            ) : null}
          </div>
        ) : null}
        <ResponsiveDialogFooter className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              if (line) {
                editor.remove(line.id);
              }
              onClose();
            }}
          >
            {t.editSheet.remove}
          </Button>
          <Button type="button" size="lg" onClick={onClose}>
            {t.editSheet.done}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
