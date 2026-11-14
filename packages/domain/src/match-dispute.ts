import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** How long after a Match completes a seated player may dispute it. */
export const MATCH_DISPUTE_DAYS = 7;

export const MATCH_DISPUTE_NOTE_MAX_LENGTH = 280;

export type MatchDisputeState = {
  canDispute?: boolean;
  openDispute?: { raisedByViewer: boolean } | null;
};

export type MatchDisputeView =
  | { kind: "none" }
  | { kind: "raise"; label: string; hint: string }
  | { kind: "open"; line: string };

/**
 * The Match dispute row under a played Game: the action for a seated player
 * of a Match that counted for Temba Level, or the line saying a dispute waits
 * on Temba. Nothing for everyone else.
 */
export function matchDisputeView(
  match: MatchDisputeState | null | undefined,
  locale: Locale,
): MatchDisputeView {
  const copy = messagesFor(locale).rating.dispute;
  if (match?.openDispute) {
    return {
      kind: "open",
      line: match.openDispute.raisedByViewer
        ? copy.openByViewer
        : copy.openByOther,
    };
  }
  if (match?.canDispute) {
    return { kind: "raise", label: copy.action, hint: copy.hint };
  }
  return { kind: "none" };
}

export function matchDisputeSheetCopy(locale: Locale) {
  const copy = messagesFor(locale).rating.dispute;
  return {
    title: copy.sheetTitle,
    description: copy.sheetDescription(MATCH_DISPUTE_DAYS),
    noteLabel: copy.noteLabel,
    notePlaceholder: copy.notePlaceholder,
    submit: copy.submit,
  };
}

export function matchDisputeCanSubmit(note: string) {
  const trimmed = note.trim();
  return trimmed.length > 0 && trimmed.length <= MATCH_DISPUTE_NOTE_MAX_LENGTH;
}
