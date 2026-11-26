"use client";

import type { FootballDraftAnswerState } from "@repo/domain/football-draft";

import { useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

import { draftAnswerMark } from "./football-draft-view";

/**
 * A Captain's answer as a mark: Approved and Change asked as `ResultMark`
 * draws a win and a loss, Waiting hatched for "not yet". A side with nobody
 * to ask has no mark.
 */
export function DraftAnswerMark({
  state,
  className = "size-5",
}: {
  state: FootballDraftAnswerState;
  className?: string;
}) {
  const mark = draftAnswerMark(state);
  if (mark == null) {
    return null;
  }
  if (mark === "hatch") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "border-rule relative block shrink-0 overflow-hidden rounded-full border",
          className,
        )}
      >
        <Hatch className="absolute inset-0" />
      </span>
    );
  }
  return <ResultMark variant={mark} decorative className={className} />;
}

/** The mark and its word: "Approved", "Change asked", "Waiting", "nobody to ask". */
export function DraftAnswer({ state }: { state: FootballDraftAnswerState }) {
  const m = useMessages().football.draft.answer;
  const answered = state === "approved" || state === "change_asked";
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <DraftAnswerMark state={state} />
      <span
        className={cn(
          "text-meta",
          answered ? "font-semibold" : "text-muted-foreground",
        )}
      >
        {m[state]}
      </span>
    </span>
  );
}

/** The note a Side captain sent with a change asked, set apart under the row. */
export function DraftNote({ note }: { note: string }) {
  const m = useMessages().football.draft;
  return (
    <p className="bg-wash text-meta rounded-md px-3 py-2.5">{m.note(note)}</p>
  );
}

export function DraftTag() {
  const m = useMessages().football.draft;
  return (
    <span className="border-ink shrink-0 rounded-[6px] border px-1.5 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.08em]">
      {m.tag}
    </span>
  );
}
