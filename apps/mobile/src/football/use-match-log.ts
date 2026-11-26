import {
  changeMinute,
  changePlayer,
  changeRedCardReason,
  logGoal,
  logOwnGoal,
  logRedCard,
  logUnknownGoal,
  logWarning,
  removeLatestGoal,
  removeLine,
  restoreLines,
  type Clock,
  type LogPlayer,
  type MatchLogKind,
  type MatchLogLine,
  type RedCardReason,
  type Removal,
} from "@repo/domain/football-match-log";
import type { Side } from "@repo/domain/football-board";
import { useRef, useState } from "react";

/**
 * The Match log while it is being entered: the lines, what the next tap
 * records (back to a goal after every line), and the lines the last removal
 * took out, which Undo brings back until the next change.
 */
export function useMatchLog(clock: Clock) {
  const [lines, setLines] = useState<MatchLogLine[] | null>(null);
  const [mode, setMode] = useState<MatchLogKind>("goal");
  const [removed, setRemoved] = useState<MatchLogLine[]>([]);
  const nextId = useRef(0);

  const stamp = () => ({
    id: `new-${(nextId.current += 1)}`,
    at: new Date(),
    ...clock,
  });

  const current = lines ?? [];

  function change(next: MatchLogLine[]) {
    setLines(next);
    setRemoved([]);
  }

  function takeOut(removal: Removal) {
    if (removal.removed.length === 0) {
      return;
    }
    setLines(removal.lines);
    setRemoved(removal.removed);
  }

  return {
    lines,
    mode,
    removed,
    setMode,
    start: (initial: MatchLogLine[]) => setLines(initial),
    tapPlayer: (player: LogPlayer) => {
      if (mode === "goal") {
        change(logGoal(current, player, stamp()));
      } else if (mode === "own_goal") {
        change(logOwnGoal(current, player, stamp()));
      } else if (mode === "warning") {
        change(logWarning(current, player, stamp()));
      }
      setMode("goal");
    },
    giveRedCard: (player: LogPlayer, reason: RedCardReason | null) => {
      change(logRedCard(current, player, reason, stamp()));
      setMode("goal");
    },
    addUnknownGoal: (side: Side) =>
      change(logUnknownGoal(current, side, stamp())),
    removeLatestGoal: (side: Side) => takeOut(removeLatestGoal(current, side)),
    remove: (id: string) => takeOut(removeLine(current, id)),
    undo: () => {
      setLines(restoreLines(current, removed));
      setRemoved([]);
    },
    changePlayer: (id: string, player: LogPlayer) =>
      change(changePlayer(current, id, player)),
    changeMinute: (id: string, minute: number) =>
      change(changeMinute(current, id, minute)),
    changeReason: (id: string, reason: RedCardReason | null) =>
      change(changeRedCardReason(current, id, reason)),
  };
}

export type MatchLogEditor = ReturnType<typeof useMatchLog>;
