"use client";

import {
  groupLinkRequestAcceptConfirm,
  groupLinkRequestAcceptedToast,
  groupLinkRequestDeclineConfirm,
} from "@repo/domain/group-link-request";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
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
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const [acceptOpen, setAcceptOpen] = React.useState(false);
  const [declineOpen, setDeclineOpen] = React.useState(false);
  const acceptConfirm = groupLinkRequestAcceptConfirm(
    request.groupName,
    request.venueName,
    locale,
  );
  const declineConfirm = groupLinkRequestDeclineConfirm(
    request.venueName,
    locale,
  );

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
      toast.success(
        groupLinkRequestAcceptedToast(
          request.groupName,
          request.venueName,
          locale,
        ),
      );
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
      toast.success(m.group.linkRequest.declinedToast);
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
          aria-label={m.webGroup.linkRequest.declineFrom(request.venueName)}
          onClick={() => setDeclineOpen(true)}
        >
          {m.group.linkRequest.declineLabel}
        </Button>
        <Button
          type="button"
          aria-label={m.webGroup.linkRequest.reviewFrom(request.venueName)}
          onClick={() => setAcceptOpen(true)}
        >
          {m.group.linkRequest.acceptLabel}
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
            <ResponsiveDialogTitle>{acceptConfirm.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {acceptConfirm.description}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ul className="text-body text-muted-foreground list-disc space-y-1.5 ps-5">
            {acceptConfirm.consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={accept.isPending}
              onClick={() => setAcceptOpen(false)}
            >
              {acceptConfirm.cancelLabel}
            </Button>
            <Button
              type="button"
              className="min-h-11"
              pending={accept.isPending}
              pendingLabel={acceptConfirm.pendingLabel}
              onClick={() => accept.mutate({ requestId: request.id })}
            >
              {acceptConfirm.confirmLabel}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        title={declineConfirm.title}
        description={declineConfirm.description}
        confirmLabel={declineConfirm.confirmLabel}
        cancelLabel={declineConfirm.cancelLabel}
        variant="default"
        pending={decline.isPending}
        onConfirm={async () => {
          await decline.mutateAsync({ requestId: request.id });
        }}
      />
    </>
  );
}
