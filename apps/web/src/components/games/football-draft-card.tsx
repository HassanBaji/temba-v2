"use client";

import {
  bibNames,
  lineupPlayerName,
  ofSide,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  footballDraftSavedLine,
  footballDraftSummary,
} from "@repo/domain/football-draft";
import { PencilIcon, Share } from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import type { RouterOutputs } from "~/trpc/react";

import { BibChip } from "./football-bibs";
import { DraftAnswer, DraftNote, DraftTag } from "./football-draft-answer";

type SavedDraft = NonNullable<RouterOutputs["games"]["footballBoard"]["draft"]>;

function SideAnswerRow({
  draft,
  side,
  players,
}: {
  draft: SavedDraft;
  side: 1 | 2;
  players: readonly BoardPlayer[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const captainId = ofSide(draft.captains, side);
  const captain = lineupPlayerName(
    players.find((player) => player.userId === captainId),
    locale,
  );
  const answer = ofSide(draft.answers, side);
  return (
    <li className="border-rule space-y-2.5 border-t pt-3">
      <div className="flex items-center gap-2.5">
        <BibChip bib={ofSide(draft.bibs, side)} className="size-3.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {ofSide(bibNames(draft.bibs, locale), side)}
          </p>
          <p className="text-muted-foreground text-eyebrow truncate">
            {captain
              ? m.football.captains.named(captain)
              : m.football.captains.none}
          </p>
        </div>
        <DraftAnswer state={answer.state} />
      </div>
      {answer.state === "change_asked" && answer.note ? (
        <DraftNote note={answer.note} />
      ) : null}
    </li>
  );
}

/**
 * The Organizer's Draft line-up on the Game page (ADR-0107, design 1c): when
 * it was saved, whether it can be published as it stands, each side's Side
 * captain and their answer (ADR-0108), then Publish teams, Share draft and
 * Edit draft. Publishing never waits on an answer.
 */
export function FootballDraftCard({
  draft,
  players,
  game,
  publishPending,
  onPublish,
  shareHref,
  editHref,
}: {
  draft: SavedDraft;
  players: readonly BoardPlayer[];
  game: { groupId: string | null };
  publishPending: boolean;
  onPublish: () => void;
  shareHref: string;
  editHref: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.football.draft;
  const t = m.webTournament.footballTeams;
  const summary = footballDraftSummary(
    {
      ...draft.sides,
      bibs: draft.bibs,
      captains: draft.captains,
      answers: draft.answers,
    },
    players.map((player) => player.userId),
    game,
    locale,
  );
  return (
    <div className="space-y-3">
      <section
        aria-labelledby="football-draft-heading"
        className="border-ink bg-paper space-y-3 rounded-xl border p-5"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <DraftTag />
            <h2
              id="football-draft-heading"
              className="min-w-0 flex-1 font-semibold"
            >
              {copy.title}
            </h2>
            <span className="text-muted-foreground text-meta shrink-0">
              {footballDraftSavedLine(draft.savedAt, locale)}
            </span>
          </div>
          <p aria-live="polite" className="text-muted-foreground text-meta">
            {summary.line}
          </p>
        </div>
        <ul className="space-y-3">
          <SideAnswerRow draft={draft} side={1} players={players} />
          <SideAnswerRow draft={draft} side={2} players={players} />
        </ul>
      </section>
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!summary.canPublish}
        pending={publishPending}
        onClick={onPublish}
      >
        {t.publish}
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" size="lg" className="flex-1" asChild>
          <Link href={shareHref}>
            <Share aria-hidden="true" />
            {m.football.draftShare.title}
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="flex-1" asChild>
          <Link href={editHref}>
            <PencilIcon aria-hidden="true" />
            {t.editDraft}
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-eyebrow">
        {copy.publishAnyTime}
      </p>
    </div>
  );
}
