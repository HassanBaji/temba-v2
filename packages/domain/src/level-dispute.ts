import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr, wholeOvrFromMu } from "./football-ovr";
import { formatPadelLevel, levelFromMu } from "./level";
import type { LevelOverrideReason } from "./level-slider";
import { sportLabel, type Sport } from "./sport";

/** How long after a Level override its player may dispute it. */
export const LEVEL_DISPUTE_DAYS = 14;

export const LEVEL_DISPUTE_NOTE_MAX_LENGTH = 280;

/**
 * Where a Level override stands for its player: `available` while they may
 * still dispute it, or what became of the dispute they raised. Null when it
 * cannot be disputed and never was.
 */
export type LevelDisputeState =
  | "available"
  | "open"
  | "upheld"
  | "dismissed"
  | null;

export type LevelDisputeView =
  | { kind: "none" }
  | { kind: "raise"; label: string }
  | { kind: "status"; line: string };

/** The dispute action or status under a Level override in Rating history. */
export function levelDisputeView(
  state: LevelDisputeState,
  locale: Locale,
): LevelDisputeView {
  const copy = messagesFor(locale).rating.levelDispute;
  switch (state) {
    case "available":
      return { kind: "raise", label: copy.action };
    case "open":
      return { kind: "status", line: copy.open };
    case "upheld":
      return { kind: "status", line: copy.upheld };
    case "dismissed":
      return { kind: "status", line: copy.dismissed };
    default:
      return { kind: "none" };
  }
}

export function levelDisputeSheetCopy(locale: Locale) {
  const copy = messagesFor(locale).rating.levelDispute;
  return {
    title: copy.sheetTitle,
    description: copy.sheetDescription(LEVEL_DISPUTE_DAYS),
    noteLabel: copy.noteLabel,
    notePlaceholder: copy.notePlaceholder,
    submit: copy.submit,
  };
}

export function levelDisputeCanSubmit(note: string) {
  const trimmed = note.trim();
  return trimmed.length > 0 && trimmed.length <= LEVEL_DISPUTE_NOTE_MAX_LENGTH;
}

/** The disputed Level override as an Operator reads it, setter included. */
export type OperatorLevelDisputeOverride = {
  sport: Sport;
  muBefore: number;
  muAfter: number;
  setByRole: "level_setter" | "operator" | "verifier";
  setBy: { name: string } | null;
  venue: { name: string } | null;
  reason: LevelOverrideReason | null;
  note: string | null;
};

function levelFace(sport: Sport, mu: number) {
  return sport === "football"
    ? formatOvr(wholeOvrFromMu(mu))
    : formatPadelLevel(levelFromMu(mu), 2);
}

/** What an Operator reads on an open Level dispute: the move and who made it, and why. */
export function operatorLevelDisputeLines(
  override: OperatorLevelDisputeOverride,
  locale: Locale,
) {
  const all = messagesFor(locale);
  const copy = all.rating.levelDispute.operator;
  const name = override.setBy?.name ?? copy.someone;
  const who = override.venue ? copy.atVenue(name, override.venue.name) : name;
  return {
    change: copy.change(
      sportLabel(override.sport, locale) ?? override.sport,
      levelFace(override.sport, override.muBefore),
      levelFace(override.sport, override.muAfter),
    ),
    adjustedBy: copy.adjustedBy(
      who,
      copy.roles[override.setByRole],
      override.reason
        ? all.rating.adjust.reasons[override.reason]
        : all.level.noReasonGiven,
    ),
    adjustedNote: override.note ? copy.adjustedNote(override.note) : null,
  };
}
