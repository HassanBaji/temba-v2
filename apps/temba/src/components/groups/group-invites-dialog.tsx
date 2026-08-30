"use client";

import type { RefObject } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { InviteLinkPanel } from "~/components/invites/invite-link-panel";
import { LookupInvitePanel } from "~/components/invites/lookup-invite-panel";
import type { LookupUserOption } from "~/components/invites/lookup-user-select";

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
  sendError,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searchPending,
  refused,
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
  sendError?: { message: string; data?: { zodError?: unknown } | null } | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: LookupUserOption[] | undefined;
  searchPending?: boolean;
  refused?: { name: string; message: string }[] | null;
  onSendLookup: (userIds: string[]) => void;
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
            <LookupInvitePanel
              description={
                isLoose
                  ? "Only you can search existing Users and send Lookup invites. The invitee accepts on Invites. Lookup invites do not expire."
                  : "Owner or Admin can search any existing User. Accept auto-admits them as Community Member then joins this Group. The Group creator may invite existing Members only. Invitees accept on Invites."
              }
              lookupInvites={lookupInvites}
              sendPending={sendPending}
              revokePending={revokePending}
              sendError={sendError}
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchResults={searchResults}
              searchPending={searchPending}
              refused={refused}
              onSendUserIds={onSendLookup}
              onRevokeLookup={onRevokeLookup}
            />
          ) : null}

          {canManageInviteLinks ? (
            <InviteLinkPanel
              inviteUrl={inviteUrl}
              copyPending={copyPending}
              onCopy={onCopyInviteLink}
            />
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
