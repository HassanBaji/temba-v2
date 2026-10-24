"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

export function VenueLinkRequestActions({
  request,
}: {
  request: { id: string; groupName: string | null; venueName: string };
}) {
  const utils = api.useUtils();
  const [acceptOpen, setAcceptOpen] = React.useState(false);
  const [declineOpen, setDeclineOpen] = React.useState(false);
  const groupName = request.groupName ?? "this Group";

  async function refresh() {
    await Promise.all([
      utils.groups.pendingLinkRequests.invalidate(),
      utils.groups.byId.invalidate(),
      utils.groups.mine.invalidate(),
      utils.groups.mineLoose.invalidate(),
      utils.communities.mine.invalidate(),
    ]);
  }

  const accept = api.groups.acceptLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success(`${groupName} is now part of ${request.venueName}`);
      setAcceptOpen(false);
      await refresh();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      void refresh();
    },
  });

  const decline = api.groups.declineLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success("Request declined");
      setDeclineOpen(false);
      await refresh();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      void refresh();
    },
  });

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          aria-label={`Decline the request from ${request.venueName}`}
          onClick={() => setDeclineOpen(true)}
        >
          Decline
        </Button>
        <Button
          type="button"
          aria-label={`Review the request from ${request.venueName}`}
          onClick={() => setAcceptOpen(true)}
        >
          Accept
        </Button>
      </div>

      <ResponsiveDialog
        open={acceptOpen}
        onOpenChange={(next) => {
          if (!accept.isPending) {
            setAcceptOpen(next);
          }
        }}
      >
        <ResponsiveDialogContent showCloseButton={false}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              Add {groupName} to {request.venueName}&rsquo;s Community?
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {groupName} becomes a Club Group. Here is what changes.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ul className="text-body text-muted-foreground list-disc space-y-1.5 pl-5">
            <li>Everyone in the Group becomes a Community Member.</li>
            <li>
              New people can&rsquo;t join directly. They send a request instead.
            </li>
            <li>
              You can&rsquo;t make Invite links any more. You can still invite
              existing Community Members.
            </li>
            <li>New Games are held at {request.venueName}.</li>
            <li>
              The Group is Verified, so it can host Rated Games and Games open
              to anyone with the link.
            </li>
          </ul>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={accept.isPending}
              onClick={() => setAcceptOpen(false)}
            >
              Not now
            </Button>
            <Button
              type="button"
              className="min-h-11"
              pending={accept.isPending}
              pendingLabel="Adding…"
              onClick={() => accept.mutate({ requestId: request.id })}
            >
              Add Group
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        title={`Decline ${request.venueName}'s request?`}
        description={`${request.venueName} will see that you declined. They can send a new request later.`}
        confirmLabel="Decline request"
        cancelLabel="Keep request"
        variant="default"
        pending={decline.isPending}
        onConfirm={async () => {
          await decline.mutateAsync({ requestId: request.id });
        }}
      />
    </>
  );
}
