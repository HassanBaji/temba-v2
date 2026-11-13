"use client";

import { ChevronRight, NotebookPen } from "lucide-react";
import Link from "next/link";

import { useMessages } from "~/components/locale-provider";

import { MY_NOTES_PATH } from "./my-notes-screen";

/** The You page's way into Your notes. */
export function MyNotesLink() {
  const m = useMessages().gameAlbum.myNotes;
  return (
    <Link
      href={MY_NOTES_PATH}
      className="rounded-card border-rule bg-paper hover:bg-wash focus-visible:ring-ring/50 flex min-h-11 items-center gap-3 border px-4 py-3.5 outline-none focus-visible:ring-[3px]"
    >
      <NotebookPen aria-hidden="true" className="size-5" />
      <span className="min-w-0 flex-1">
        <span className="text-body block font-semibold">{m.entry}</span>
        <span className="text-eyebrow text-muted-foreground block">
          {m.entryHint}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground size-5 rtl:-scale-x-100"
      />
    </Link>
  );
}
