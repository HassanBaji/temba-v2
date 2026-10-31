"use client";

import { useEffect, useState } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import {
  GROUP_JOIN_NOTE_MAX_LENGTH,
  GROUP_REQUEST_JOIN_SHEET,
} from "@repo/domain/group-admin";

export function RequestJoinDialog({
  open,
  onOpenChange,
  pending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSend: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setNote("");
    }
  }, [open]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSend(note);
          }}
          className="flex flex-col gap-4"
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {GROUP_REQUEST_JOIN_SHEET.title}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {GROUP_REQUEST_JOIN_SHEET.description}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={GROUP_REQUEST_JOIN_SHEET.notePlaceholder}
            aria-label={GROUP_REQUEST_JOIN_SHEET.notePlaceholder}
            maxLength={GROUP_JOIN_NOTE_MAX_LENGTH}
            disabled={pending}
            rows={3}
            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 md:text-body mx-4 min-h-24 resize-none rounded-md border bg-transparent px-3 py-2.5 text-base outline-none focus-visible:ring-[3px] disabled:opacity-50 md:mx-0"
          />
          <ResponsiveDialogFooter>
            <Button
              type="submit"
              size="lg"
              pending={pending}
              className="w-full font-semibold"
            >
              {GROUP_REQUEST_JOIN_SHEET.submitLabel}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
