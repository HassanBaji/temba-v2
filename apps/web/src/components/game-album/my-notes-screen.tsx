"use client";

import {
  filterMyNotes,
  myNoteGameLine,
  myNotesByMonth,
  myNotesCounts,
  noteScoreLine,
  type MyGameNote,
  type MyNotesTab,
} from "@repo/domain/game-album";
import { LockIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { SettingsScreen } from "~/components/settings/settings-screen";
import { ResultMark } from "~/components/temba/result-mark";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export const MY_NOTES_PATH = "/dashboard/you/notes";

const TABS: MyNotesTab[] = ["all", "private", "public"];

function NoteEntry({ note }: { note: MyGameNote }) {
  const locale = useLocale();
  const m = useMessages().gameAlbum.myNotes;
  const score = noteScoreLine(note.game.sets);
  const privateNote = note.visibility === "private";
  return (
    <li>
      <Link
        href={`/dashboard/games/${note.gameId}`}
        className="hover:bg-wash focus-visible:ring-ring/50 flex flex-col gap-1.5 p-3.5 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <span className="flex items-center gap-2">
          <ResultMark
            variant={note.game.outcome ?? "not-played"}
            decorative
            className="size-3"
          />
          {score ? (
            <span className="font-expanded text-meta font-bold">{score}</span>
          ) : null}
          <span className="text-eyebrow text-muted-foreground min-w-0 flex-1 truncate">
            {myNoteGameLine(note, locale)}
          </span>
          <span className="text-eyebrow text-muted-foreground flex shrink-0 items-center gap-1">
            {privateNote ? (
              <LockIcon aria-hidden="true" className="size-3" />
            ) : (
              <UsersIcon aria-hidden="true" className="size-3" />
            )}
            {privateNote ? m.onlyYou : m.shared}
          </span>
        </span>
        <span className="text-body whitespace-pre-line break-words">
          {note.body}
        </span>
      </Link>
    </li>
  );
}

/** Every note you wrote, grouped by month, newest first. Only you see this page. */
export function MyNotesScreen() {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.gameAlbum.myNotes;
  const [tab, setTab] = React.useState<MyNotesTab>("all");
  const query = api.gameAlbum.myNotes.useQuery();
  const notes = query.data ?? [];
  const counts = myNotesCounts(notes);
  const months = myNotesByMonth(filterMyNotes(notes, tab), locale);
  const label = (key: MyNotesTab) =>
    key === "all"
      ? m.all(counts.all)
      : key === "private"
        ? m.private(counts.private)
        : m.public(counts.public);

  return (
    <SettingsScreen title={m.title} backHref="/dashboard/you">
      <div className="flex flex-col gap-5">
        <p className="text-meta text-muted-foreground">
          {m.subtitle(counts.all)}
        </p>
        <div
          role="tablist"
          aria-label={m.tabs}
          className="border-rule flex gap-5 border-b"
        >
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={key === tab}
              onClick={() => setTab(key)}
              className={cn(
                "text-body -mb-px border-b-2 py-2.5 outline-none focus-visible:underline",
                key === tab
                  ? "border-ink text-ink font-semibold"
                  : "text-muted-foreground border-transparent",
              )}
            >
              {label(key)}
            </button>
          ))}
        </div>
        {query.error ? (
          <ErrorState
            variant="inline"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.isLoading ? (
          <Skeleton className="rounded-card h-56" />
        ) : months.length === 0 ? (
          <div className="flex flex-col gap-1 py-6">
            <p className="text-body font-semibold">
              {notes.length === 0 ? m.empty : m.emptyFiltered}
            </p>
            {notes.length === 0 ? (
              <p className="text-meta text-muted-foreground">{m.emptyHint}</p>
            ) : null}
          </div>
        ) : (
          months.map((month) => (
            <section key={month.key} className="flex flex-col gap-2">
              <h2 className="text-eyebrow text-muted-foreground">
                {month.label}
              </h2>
              <ul className="rounded-card border-rule divide-rule divide-y overflow-hidden border">
                {month.notes.map((note) => (
                  <NoteEntry key={note.id} note={note} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </SettingsScreen>
  );
}
