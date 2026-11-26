import type { Side } from "./football-board";
import {
  changeMinute,
  changePlayer,
  changeRedCardReason,
  keepLinesOnSides,
  logGoal,
  logOwnGoal,
  logRedCard,
  logUnknownGoal,
  logWarning,
  playerTally,
  removeLatestGoal,
  removeLine,
  type Clock,
  type LogPlayer,
  type MatchLogKind,
  type MatchLogLine,
  type RedCardReason,
  type Removal,
} from "./football-match-log";

/**
 * The Match log while it is being entered. `mode` is what the next tap on a
 * player records, and goes back to a goal after every line so a card is never
 * given by a stray tap. `redCardFor` is the player the red card sheet asks
 * about. `undo` holds the log as it was before the last removal and what
 * that took out, until the next change.
 */
export type LogEditorState = {
  lines: MatchLogLine[];
  mode: MatchLogKind;
  redCardFor: LogPlayer | null;
  undo: { lines: MatchLogLine[]; removed: MatchLogLine[] } | null;
};

type Stamp = Clock & { id: string; at: Date };

export type LogEditorAction =
  | { type: "mode"; mode: MatchLogKind }
  | { type: "tapPlayer"; player: LogPlayer; stamp: Stamp }
  | { type: "giveRedCard"; reason: RedCardReason | null; stamp: Stamp }
  | { type: "cancelRedCard" }
  | { type: "addUnknownGoal"; side: Side; stamp: Stamp }
  | { type: "removeLatestGoal"; side: Side }
  | { type: "remove"; id: string }
  | { type: "undo" }
  | { type: "changePlayer"; id: string; player: LogPlayer }
  | { type: "changeMinute"; id: string; minute: number }
  | { type: "changeReason"; id: string; reason: RedCardReason | null };

export function startLogEditor(
  lines: readonly MatchLogLine[],
  players: readonly LogPlayer[],
): LogEditorState {
  const sideByUser = new Map(
    players.map((player) => [player.userId, player.sideIndex]),
  );
  return {
    lines: keepLinesOnSides(lines, (userId) => sideByUser.get(userId) ?? null),
    mode: "goal",
    redCardFor: null,
    undo: null,
  };
}

function logged(lines: MatchLogLine[]): LogEditorState {
  return { lines, mode: "goal", redCardFor: null, undo: null };
}

function edited(state: LogEditorState, lines: MatchLogLine[]): LogEditorState {
  return { ...state, lines, undo: null };
}

function tookOut(state: LogEditorState, removal: Removal): LogEditorState {
  if (removal.removed.length === 0) {
    return state;
  }
  return {
    ...state,
    lines: removal.lines,
    undo: { lines: state.lines, removed: removal.removed },
  };
}

function tapPlayer(
  state: LogEditorState,
  player: LogPlayer,
  stamp: Stamp,
): LogEditorState {
  switch (state.mode) {
    case "goal":
      return logged(logGoal(state.lines, player, stamp));
    case "own_goal":
      return logged(logOwnGoal(state.lines, player, stamp));
    case "warning":
      return logged(logWarning(state.lines, player, stamp));
    case "red_card":
      return playerTally(state.lines, player.userId).sentOff
        ? { ...state, mode: "goal" }
        : { ...state, redCardFor: player };
  }
}

export function logEditorReducer(
  state: LogEditorState,
  action: LogEditorAction,
): LogEditorState {
  switch (action.type) {
    case "mode":
      return { ...state, mode: action.mode };
    case "tapPlayer":
      return tapPlayer(state, action.player, action.stamp);
    case "giveRedCard":
      return state.redCardFor
        ? logged(
            logRedCard(
              state.lines,
              state.redCardFor,
              action.reason,
              action.stamp,
            ),
          )
        : state;
    case "cancelRedCard":
      return { ...state, mode: "goal", redCardFor: null };
    case "addUnknownGoal":
      return logged(logUnknownGoal(state.lines, action.side, action.stamp));
    case "removeLatestGoal":
      return tookOut(state, removeLatestGoal(state.lines, action.side));
    case "remove":
      return tookOut(state, removeLine(state.lines, action.id));
    case "undo":
      return state.undo
        ? { ...state, lines: state.undo.lines, undo: null }
        : state;
    case "changePlayer":
      return edited(state, changePlayer(state.lines, action.id, action.player));
    case "changeMinute":
      return edited(state, changeMinute(state.lines, action.id, action.minute));
    case "changeReason":
      return edited(
        state,
        changeRedCardReason(state.lines, action.id, action.reason),
      );
  }
}
