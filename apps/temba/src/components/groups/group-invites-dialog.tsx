"use client";

import type { RefObject } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";

type LookupInvite = {
  id: string;
  user: { name: string; email: string | null };
};

export function GroupInvitesDialog({
  open,
  onOpenChange,
  restoreFocusRef,
  isLoose,
  canManageLookupInvites,
  canManageInviteLinks,
  lookupInvites,
  inviteUrl,
  sendPending,
  revokePending,
  copyPending,
  onSendLookup,
  onRevokeLookup,
  onCopyInviteLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  isLoose: boolean;
  canManageLookupInvites: boolean;
  canManageInviteLinks: boolean;
  lookupInvites: LookupInvite[] | undefined;
  inviteUrl: string | null | undefined;
  sendPending: boolean;
  revokePending: boolean;
  copyPending: boolean;
  onSendLookup: (query: string) => void;
  onRevokeLookup: (inviteId: string) => void;
  onCopyInviteLink: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent restoreFocusRef={restoreFocusRef}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Manage invites</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Lookup invites and Invite links for this Group.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
          {canManageLookupInvites ? (
            <section className="space-y-4">
              <div>
                <h3 className="text-title font-semibold">Lookup invite</h3>
                <p className="text-body text-muted-foreground mt-1">
                  {isLoose
                    ? "Only you can look up an existing User by username, email, or phone. The invitee accepts on Invites. Lookup invites do not expire."
                    : "Owner or Admin can look up any existing User. Accept auto-admits them as Community Member then joins this Group. The Group creator may Lookup existing Members only. Invitees accept on Invites."}
                </p>
              </div>

              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const queryValue = formData.get("query");
                  if (typeof queryValue !== "string") {
                    return;
                  }
                  const query = queryValue.trim();
                  if (!query) {
                    return;
                  }
                  onSendLookup(query);
                  event.currentTarget.reset();
                }}
              >
                <Input
                  name="query"
                  type="text"
                  required
                  placeholder="Username, email, or phone"
                  className="min-h-11 flex-1"
                />
                <Button
                  type="submit"
                  className="min-h-11"
                  disabled={sendPending}
                >
                  {sendPending ? "Sending…" : "Send Lookup invite"}
                </Button>
              </form>

              {lookupInvites?.length === 0 ? (
                <p className="text-body text-muted-foreground">
                  No unused Lookup invites.
                </p>
              ) : null}
              {lookupInvites && lookupInvites.length > 0 ? (
                <ul className="divide-border divide-y">
                  {lookupInvites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-lead font-semibold">
                          {invite.user.name}
                        </p>
                        <p className="text-meta text-muted-foreground">
                          {invite.user.email}
                        </p>
                      </div>
                      <Button
                        className="min-h-11"
                        variant="outline"
                        onClick={() => onRevokeLookup(invite.id)}
                        disabled={revokePending}
                      >
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {canManageInviteLinks ? (
            <section className="space-y-4">
              <div>
                <h3 className="text-title font-semibold">Invite link</h3>
                <p className="text-body text-muted-foreground mt-1">
                  Each copy mints a new 6-hour token. Older copied URLs stay
                  live until each expires. There is no rotate or revoke.
                  Distinct from the Group URL.
                </p>
              </div>
              {inviteUrl ? (
                <p className="text-meta text-muted-foreground break-all">
                  Newest: {inviteUrl}
                </p>
              ) : (
                <p className="text-body text-muted-foreground">
                  No live Invite link. Copy to mint one.
                </p>
              )}
              <Button
                className="min-h-11"
                onClick={onCopyInviteLink}
                disabled={copyPending}
              >
                {copyPending ? "Copying…" : "Copy Invite link"}
              </Button>
            </section>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
