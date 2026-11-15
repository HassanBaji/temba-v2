"use client";

import {
  noteTimeLabel,
  notesCountLabel,
  notesFootnote,
  type GameAlbum,
  type GameAlbumNote,
} from "@repo/domain/game-album";
import { LockIcon, PencilIcon } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";

import { InitialsBadge } from "./initials-badge";
import { SectionHeading } from "./section-heading";

function NoteRow({ note }: { note: GameAlbumNote }) {
  const locale = useLocale();
  const m = useMessages().gameAlbum.notes;
  const time = noteTimeLabel(note.createdAt, locale);
  const privateNote = note.isMine && note.visibility === "private";
  return (
    <div className="flex gap-3 p-3.5">
      <InitialsBadge
        name={note.author.name}
        mine={note.isMine}
        className="size-7 rounded-lg text-[10px]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body truncate font-semibold">
            {note.isMine ? m.you : note.author.name}
          </span>
          <span className="text-eyebrow text-muted-foreground flex shrink-0 items-center gap-1">
            {privateNote ? (
              <LockIcon aria-hidden="true" className="size-3" />
            ) : null}
            {privateNote ? m.privateTime(time) : time}
          </span>
        </div>
        <p className="text-body mt-0.5 whitespace-pre-line break-words">
          {note.body}
        </p>
      </div>
    </div>
  );
}

/**
 * The notes on a played Game: yours first with who reads it and Edit, then
 * the other players' public notes, oldest first. Another player's private
 * note is never listed, and the footnote never says one exists.
 */
export function NotesSection({
  album,
  onWrite,
}: {
  album: GameAlbum;
  onWrite: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().gameAlbum.notes;
  const mine = album.notes.mine;
  const notes = [...(mine ? [mine] : []), ...album.notes.shared];
  const footnote = notesFootnote(album, new Date(), locale);

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title={m.title} count={notesCountLabel(album, locale)} />
      {!mine && album.viewer.canWriteNote ? (
        <button
          type="button"
          onClick={onWrite}
          className="rounded-card border-rule focus-visible:ring-ring/50 relative flex items-center gap-3 overflow-hidden border p-3.5 text-start outline-none hover:opacity-90 focus-visible:ring-[3px]"
        >
          <span aria-hidden="true" className="hatch absolute inset-0" />
          <UserAvatar
            name={album.viewer.person?.name ?? ""}
            image={album.viewer.person?.image ?? null}
            className="relative size-7 rounded-lg"
          />
          <span className="relative min-w-0 flex-1">
            <span className="text-body block font-semibold">
              {m.writeTitle}
            </span>
            <span className="text-eyebrow text-muted-foreground block">
              {m.writeHint}
            </span>
          </span>
          <PencilIcon aria-hidden="true" className="relative size-4" />
        </button>
      ) : null}
      {notes.length > 0 ? (
        <ul className="rounded-card border-rule divide-rule divide-y overflow-hidden border">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteRow note={note} />
              {note.isMine ? (
                <div className="border-rule bg-wash flex items-center justify-between gap-3 border-t px-3.5 py-2.5">
                  <span className="text-eyebrow text-muted-foreground">
                    {note.visibility === "private"
                      ? m.onlyYouCanRead
                      : m.everyoneCanRead}
                  </span>
                  {album.viewer.canWriteNote ? (
                    <button
                      type="button"
                      onClick={onWrite}
                      aria-label={m.editNote}
                      className="text-eyebrow font-semibold underline-offset-4 hover:underline"
                    >
                      {m.edit}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!mine && notes.length === 0 && album.viewer.canWriteNote ? (
        <p className="text-eyebrow text-muted-foreground">
          {m.emptyCaption(album.readers.length + 1)}
        </p>
      ) : footnote ? (
        <p className="text-eyebrow text-muted-foreground">{footnote}</p>
      ) : null}
    </section>
  );
}
