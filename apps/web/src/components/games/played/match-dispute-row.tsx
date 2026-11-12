"use client";

import {
  MATCH_DISPUTE_NOTE_MAX_LENGTH,
  matchDisputeCanSubmit,
  matchDisputeSheetCopy,
  matchDisputeView,
  type MatchDisputeState,
} from "@repo/domain/match-dispute";
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

/** Dispute a played Match that counted for Temba Level, or the line saying one waits. */
export function MatchDisputeRow({
  match,
}: {
  match: (MatchDisputeState & { id: string }) | null | undefined;
}) {
  const locale = useLocale();
  const m = useMessages();
  const utils = api.useUtils();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const view = matchDisputeView(match, locale);
  const sheet = matchDisputeSheetCopy(locale);

  const dispute = api.games.disputeMatchResult.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.rating.dispute.sent);
      setOpen(false);
      await utils.games.byId.invalidate();
    },
  });

  if (view.kind === "none" || !match) {
    return null;
  }
  if (view.kind === "open") {
    return (
      <p className="text-muted-foreground text-meta border-rule flex items-start gap-2 rounded-md border px-4 py-3">
        <FlagIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {view.line}
      </p>
    );
  }
  return (
    <div className="border-rule space-y-2 rounded-md border px-4 py-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          dispute.reset();
          setNote("");
          setOpen(true);
        }}
      >
        <FlagIcon aria-hidden="true" />
        {view.label}
      </Button>
      <p className="text-muted-foreground text-meta">{view.hint}</p>
      <ResponsiveDialog
        open={open}
        onOpenChange={(next) => {
          if (!dispute.isPending) {
            setOpen(next);
          }
        }}
      >
        <ResponsiveDialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (matchDisputeCanSubmit(note)) {
                dispute.mutate({ matchId: match.id, note: note.trim() });
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
              maxLength={MATCH_DISPUTE_NOTE_MAX_LENGTH}
              disabled={dispute.isPending}
              rows={3}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 md:text-body mx-4 min-h-24 resize-none rounded-md border bg-transparent px-3 py-2.5 text-base outline-none focus-visible:ring-[3px] disabled:opacity-50 md:mx-0"
            />
            {dispute.error ? (
              <p role="alert" className="text-destructive text-meta mx-4 md:mx-0">
                {dispute.error.message}
              </p>
            ) : null}
            <ResponsiveDialogFooter>
              <Button
                type="submit"
                size="lg"
                pending={dispute.isPending}
                disabled={!matchDisputeCanSubmit(note)}
                className="w-full font-semibold"
              >
                {sheet.submit}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
