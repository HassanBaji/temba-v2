"use client";

import {
  footballDraftSavedLine,
  footballDraftSummary,
} from "@repo/domain/football-draft";
import { PencilIcon } from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import type { RouterOutputs } from "~/trpc/react";

type SavedDraft = NonNullable<RouterOutputs["games"]["footballBoard"]["draft"]>;

/**
 * The Organizer's Draft line-up on the Game page (ADR-0107): when it was
 * saved, whether it can be published as it stands, then Publish teams and
 * Edit draft.
 */
export function FootballDraftCard({
  draft,
  rosterUserIds,
  publishPending,
  onPublish,
  editHref,
}: {
  draft: SavedDraft;
  rosterUserIds: readonly string[];
  publishPending: boolean;
  onPublish: () => void;
  editHref: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.football.draft;
  const t = m.webTournament.footballTeams;
  const summary = footballDraftSummary(
    { ...draft.sides, bibs: draft.bibs },
    rosterUserIds,
    locale,
  );
  return (
    <div className="space-y-3">
      <section
        aria-labelledby="football-draft-heading"
        className="border-ink bg-paper space-y-2 rounded-xl border p-5"
      >
        <div className="flex items-center gap-2.5">
          <span className="border-ink shrink-0 rounded-[6px] border px-1.5 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.08em]">
            {copy.tag}
          </span>
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
          <Link href={editHref}>
            <PencilIcon aria-hidden="true" />
            {t.editDraft}
          </Link>
        </Button>
      </div>
    </div>
  );
}
