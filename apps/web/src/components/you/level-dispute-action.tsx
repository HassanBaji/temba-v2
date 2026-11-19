"use client";

import {
  LEVEL_DISPUTE_NOTE_MAX_LENGTH,
  levelDisputeCanSubmit,
  levelDisputeSheetCopy,
} from "@repo/domain/level-dispute";
import type { RatingHistoryLine } from "@repo/domain/rating-history";
import { FlagIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

/** Dispute a Level adjustment from its Rating history line, or what became of the dispute. */
export function LevelDisputeAction({
  dispute,
}: {
  dispute: NonNullable<RatingHistoryLine["dispute"]>;
}) {
  const locale = useLocale();
  const m = useMessages();
  const utils = api.useUtils();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const sheet = levelDisputeSheetCopy(locale);

  const raise = api.ratings.disputeLevel.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.rating.levelDispute.sent);
      setOpen(false);
      await utils.ratings.history.invalidate();
    },
  });

  if (dispute.kind === "status") {
    return (
      <p className="text-eyebrow text-muted-foreground mt-1.5 flex items-start gap-[7px]">
        <FlagIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
        <span>{dispute.line}</span>
      </p>
    );
  }
  const levelOverrideId = dispute.levelOverrideId;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => {
          raise.reset();
          setNote("");
          setOpen(true);
        }}
      >
        <FlagIcon aria-hidden="true" />
        {dispute.label}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={(next) => {
          if (!raise.isPending) {
            setOpen(next);
          }
        }}
      >
        <ResponsiveDialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (levelDisputeCanSubmit(note)) {
                raise.mutate({ levelOverrideId, note: note.trim() });
              }
            }}
            className="flex flex-col gap-4"
          >
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{sheet.title}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {sheet.description}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={sheet.notePlaceholder}
              aria-label={sheet.noteLabel}
              maxLength={LEVEL_DISPUTE_NOTE_MAX_LENGTH}
              disabled={raise.isPending}
              rows={3}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 md:text-body mx-4 min-h-24 resize-none rounded-md border bg-transparent px-3 py-2.5 text-base outline-none focus-visible:ring-[3px] disabled:opacity-50 md:mx-0"
            />
            {raise.error ? (
              <p
                role="alert"
                className="text-destructive text-meta mx-4 md:mx-0"
              >
                {raise.error.message}
              </p>
            ) : null}
            <ResponsiveDialogFooter>
              <Button
                type="submit"
                size="lg"
                pending={raise.isPending}
                disabled={!levelDisputeCanSubmit(note)}
                className="w-full font-semibold"
              >
                {sheet.submit}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
