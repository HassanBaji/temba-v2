import type { Side } from "@repo/domain/football-board";
import type {
  Clock,
  LogPlayer,
  MatchLogKind,
  MatchLogLine,
  RedCardReason,
} from "@repo/domain/football-match-log";
import {
  logEditorReducer,
  startLogEditor,
  type LogEditorAction,
  type LogEditorState,
} from "@repo/domain/football-match-log-editor";
import { useCallback, useRef, useState } from "react";

/** The Match log while it is being entered, on the shared editor rules. */
export function useMatchLog(clock: Clock) {
  const [state, setState] = useState<LogEditorState | null>(null);
  const nextId = useRef(0);

  const stamp = () => ({
    id: `new-${(nextId.current += 1)}`,
    at: new Date(),
    ...clock,
  });
  const dispatch = (action: LogEditorAction) =>
    setState((current) => current && logEditorReducer(current, action));

  return {
    lines: state?.lines ?? null,
    mode: state?.mode ?? "goal",
    redCardFor: state?.redCardFor ?? null,
    removed: state?.undo?.removed ?? [],
    start: useCallback(
      (lines: readonly MatchLogLine[], players: readonly LogPlayer[]) =>
        setState(startLogEditor(lines, players)),
      [],
    ),
    setMode: (mode: MatchLogKind) => dispatch({ type: "mode", mode }),
    tapPlayer: (player: LogPlayer) =>
      dispatch({ type: "tapPlayer", player, stamp: stamp() }),
    giveRedCard: (reason: RedCardReason | null) =>
      dispatch({ type: "giveRedCard", reason, stamp: stamp() }),
    cancelRedCard: () => dispatch({ type: "cancelRedCard" }),
    addUnknownGoal: (side: Side) =>
      dispatch({ type: "addUnknownGoal", side, stamp: stamp() }),
    removeLatestGoal: (side: Side) =>
      dispatch({ type: "removeLatestGoal", side }),
    remove: (id: string) => dispatch({ type: "remove", id }),
    undo: () => dispatch({ type: "undo" }),
    changePlayer: (id: string, player: LogPlayer) =>
      dispatch({ type: "changePlayer", id, player }),
    changeMinute: (id: string, minute: number) =>
      dispatch({ type: "changeMinute", id, minute }),
    changeReason: (id: string, reason: RedCardReason | null) =>
      dispatch({ type: "changeReason", id, reason }),
  };
}

export type MatchLogEditor = ReturnType<typeof useMatchLog>;
