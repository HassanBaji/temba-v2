"use client";

import {
  bibNames,
  byKeeperThenLevel,
  shortName,
  teamsSideAverage,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  FOOTBALL_DRAFT_NOTE_MAX_LENGTH,
  type FootballBalanceOn,
  type FootballDraftAnswer,
} from "@repo/domain/football-lineup";
import { Share } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import type { RouterOutputs } from "~/trpc/react";

import { BibChip } from "./football-bibs";
import {
  DraftAnswer,
  DraftAnswerMark,
  DraftNote,
  DraftTag,
} from "./football-draft-answer";
import { draftCaptainName } from "./football-draft-view";

type SavedDraft = NonNullable<RouterOutputs["games"]["footballBoard"]["draft"]>;

function AskChangeDialog({
  open,
  organizer,
  pending,
  onClose,
  onSend,
}: {
  open: boolean;
  organizer: string;
  pending: boolean;
  onClose: () => void;
  onSend: (note: string) => void;
}) {
  const m = useMessages().football.draft.captainPanel.noteSheet;
  const fieldId = React.useId();
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setNote("");
    }
  }, [open]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (note.trim().length > 0) {
              onSend(note.trim());
            }
          }}
          className="flex flex-col gap-4"
        >
          <ResponsiveDialogHeader className="text-start">
            <ResponsiveDialogTitle>{m.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {m.body(organizer)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="mx-4 flex flex-col gap-2 md:mx-0">
            <label htmlFor={fieldId} className="text-meta font-medium">
              {m.label}
            </label>
            <textarea
              id={fieldId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={m.placeholder}
              maxLength={FOOTBALL_DRAFT_NOTE_MAX_LENGTH}
              required
              disabled={pending}
              rows={3}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 md:text-body min-h-24 resize-none rounded-md border bg-transparent px-3 py-2.5 text-base outline-none focus-visible:ring-[3px] disabled:opacity-50"
            />
          </div>
          <ResponsiveDialogFooter className="flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={onClose}
            >
              {m.cancel}
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-[1.6] font-semibold"
              pending={pending}
              disabled={note.trim().length === 0}
            >
              {m.send}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * A Side captain's own team on the Draft line-up (design 2a, ADR-0108):
 * Approve my team or Ask for a change, and once answered the answer with
 * Undo. Under it the other team with its captain and that captain's answer,
 * whose note they never see.
 */
export function FootballCaptainDraftPanel({
  draft,
  side,
  players,
  balanceOn,
  pending,
  onAnswer,
  shareHref,
}: {
  draft: SavedDraft;
  side: 1 | 2;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  pending: FootballDraftAnswer | "undo" | null;
  onAnswer: (answer: FootballDraftAnswer | null, note?: string) => void;
  shareHref: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.football.draft;
  const panel = copy.captainPanel;
  const [asking, setAsking] = React.useState(false);
  const own = side === 1 ? "slot1" : "slot2";
  const other = side === 1 ? "slot2" : "slot1";
  const names = bibNames(draft.bibs, locale);
  const members = players
    .filter((player) => draft.sides[own].includes(player.userId))
    .sort(byKeeperThenLevel);
  const organizer = shortName(draft.savedByName);
  const answer = draft.answers[own];
  const otherCaptain = draftCaptainName(
    players.find((player) => player.userId === draft.captains[other]),
    m.common.you,
  );

  React.useEffect(() => {
    if (answer.state === "change_asked") {
      setAsking(false);
    }
  }, [answer.state]);

  const answered = (title: string, body: string, note: string | null) => (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <DraftAnswerMark state={answer.state} className="size-6" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-muted-foreground text-eyebrow">{body}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          pending={pending === "undo"}
          disabled={pending != null}
          onClick={() => onAnswer(null)}
        >
          {panel.undo}
        </Button>
      </div>
      {note ? <DraftNote note={note} /> : null}
    </div>
  );

  return (
    <div className="space-y-3">
      <section
        aria-labelledby="football-captain-draft-heading"
        className="border-ink bg-paper space-y-3 rounded-xl border p-5"
      >
        <div className="flex items-center gap-2.5">
          <DraftTag />
          <h2
            id="football-captain-draft-heading"
            className="min-w-0 flex-1 truncate font-semibold"
          >
            {panel.yourTeam(names[own])}
          </h2>
          <span className="text-muted-foreground text-eyebrow shrink-0">
            {panel.playersAvg(
              members.length,
              teamsSideAverage(members, locale, balanceOn),
            )}
          </span>
        </div>
        <div aria-live="polite">
          {answer.state === "approved" ? (
            answered(
              panel.approvedTitle(names[own]),
              panel.approvedBody(organizer),
              null,
            )
          ) : answer.state === "change_asked" ? (
            answered(
              panel.changeTitle,
              panel.changeBody(organizer),
              answer.note,
            )
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-meta">
                {panel.ask(organizer)}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  pending={pending === "approved"}
                  disabled={pending != null}
                  onClick={() => onAnswer("approved")}
                >
                  {panel.approve}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  aria-haspopup="dialog"
                  disabled={pending != null}
                  onClick={() => setAsking(true)}
                >
                  {panel.askChange}
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="border-rule flex items-center gap-2.5 border-t pt-3">
          <BibChip bib={draft.bibs[other]} className="size-3.5" />
          <p className="text-muted-foreground text-meta min-w-0 flex-1 truncate">
            {panel.otherTeam(names[other], otherCaptain)}
          </p>
          <DraftAnswer state={draft.answers[other].state} />
        </div>
      </section>
      <Button variant="outline" size="lg" className="w-full" asChild>
        <Link href={shareHref}>
          <Share aria-hidden="true" />
          {m.football.draftShare.title}
        </Link>
      </Button>
      <p className="text-muted-foreground text-eyebrow">
        {panel.ownTeamOnly(names[other])}
      </p>
      <AskChangeDialog
        open={asking}
        organizer={organizer}
        pending={pending === "change_asked"}
        onClose={() => setAsking(false)}
        onSend={(note) => onAnswer("change_asked", note)}
      />
    </div>
  );
}
