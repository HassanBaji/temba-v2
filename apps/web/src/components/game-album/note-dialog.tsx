"use client";

import {
  everyoneWhoPlayed,
  GAME_NOTE_MAX_LENGTH,
  noteCharacterCount,
  noteDraftIsSavable,
  noteReadersHint,
  type GameAlbum,
  type GameNoteVisibility,
} from "@repo/domain/game-album";
import { LockIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { SelectCard } from "~/components/ui/select-card";

import { AlbumSheet } from "./album-sheet";

/**
 * Your one note on a played Game. The two cards pick who reads it; the hint,
 * the counter and the save button follow the choice, so the last thing you
 * read before saving says who will read it.
 */
export function NoteDialog({
  open,
  album,
  context,
  pending,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  album: GameAlbum;
  context: string | null;
  pending: boolean;
  onClose: () => void;
  onSave: (body: string, visibility: GameNoteVisibility) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const locale = useLocale();
  const m = useMessages().gameAlbum.note;
  const mine = album.notes.mine;
  const fieldId = React.useId();
  const hintId = React.useId();
  const [body, setBody] = React.useState("");
  const [visibility, setVisibility] =
    React.useState<GameNoteVisibility>("private");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setBody(mine?.body ?? "");
      setVisibility(mine?.visibility ?? "private");
      setConfirmDelete(false);
    }
  }, [open, mine]);

  const isPrivate = visibility === "private";
  const players = album.readers.length + 1;

  const save = async () => {
    if (await onSave(body, visibility)) {
      toast.success(isPrivate ? m.saved : m.shared);
      onClose();
    }
  };

  const remove = async () => {
    if (await onDelete()) {
      toast.success(m.deleted);
      onClose();
    }
  };

  return (
    <AlbumSheet
      open={open}
      onClose={onClose}
      title={m.title}
      subtitle={[context, m.subtitle].filter(Boolean).join(" ")}
      footer={
        <Button
          size="lg"
          className="w-full font-semibold"
          pending={pending}
          disabled={!noteDraftIsSavable(body)}
          onClick={() => void save()}
        >
          {isPrivate ? (
            <LockIcon aria-hidden="true" />
          ) : (
            <UsersIcon aria-hidden="true" />
          )}
          {isPrivate ? m.savePrivate : m.savePublic(players)}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-meta text-muted-foreground" id={`${fieldId}-who`}>
          {m.who}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={`${fieldId}-who`}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <SelectCard
            role="radio"
            selected={!isPrivate}
            title={
              <span className="flex items-center gap-2">
                <UsersIcon aria-hidden="true" className="size-4" />
                {everyoneWhoPlayed(album, locale)}
              </span>
            }
            description={m.everyoneHint}
            onClick={() => setVisibility("public")}
          />
          <SelectCard
            role="radio"
            selected={isPrivate}
            title={
              <span className="flex items-center gap-2">
                <LockIcon aria-hidden="true" className="size-4" />
                {m.onlyMe}
              </span>
            }
            description={m.onlyMeHint}
            onClick={() => setVisibility("private")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="sr-only">
          {m.fieldLabel}
        </label>
        <textarea
          id={fieldId}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={m.placeholder}
          maxLength={GAME_NOTE_MAX_LENGTH}
          aria-describedby={hintId}
          rows={5}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 md:text-body min-h-32 resize-none rounded-md border bg-transparent px-3 py-2.5 text-base outline-none focus-visible:ring-[3px]"
        />
        <div
          id={hintId}
          className="text-eyebrow text-muted-foreground flex justify-between gap-3"
        >
          <span>
            {isPrivate ? m.privateHint : noteReadersHint(album.readers, locale)}
          </span>
          <span className="tabular-nums">
            {noteCharacterCount(body, locale)}
          </span>
        </div>
      </div>
      {mine ? (
        confirmDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-body font-semibold">{m.deleteTitle}</p>
            <p className="text-meta text-muted-foreground">{m.deleteBody}</p>
            <Button
              variant="outline"
              pending={pending}
              onClick={() => void remove()}
            >
              {m.deleteConfirm}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-meta self-start font-semibold underline-offset-4 hover:underline"
          >
            {m.delete}
          </button>
        )
      ) : null}
    </AlbumSheet>
  );
}
