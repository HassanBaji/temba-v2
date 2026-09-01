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

export function GameInvitesDialog({
  open,
  onOpenChange,
  restoreFocusRef,
  canSendLookup,
  canCopyInviteLink,
  inviteUrl,
  sendPending,
  copyPending,
  sendError,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searchPending,
  refused,
  onSendLookup,
  onCopyInviteLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  canSendLookup: boolean;
  canCopyInviteLink: boolean;
  inviteUrl: string | null | undefined;
  sendPending: boolean;
  copyPending: boolean;
  sendError?: { message: string; data?: { zodError?: unknown } | null } | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: LookupUserOption[] | undefined;
  searchPending?: boolean;
  refused?: { name: string; message: string }[] | null;
  onSendLookup: (userIds: string[]) => void;
  onCopyInviteLink: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent restoreFocusRef={restoreFocusRef}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Invite</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            Search for Users or copy an invite link.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-6 px-4 pb-4 md:px-0 md:pb-0">
          {canSendLookup ? (
            <LookupInvitePanel
              compact
              sendPending={sendPending}
              sendError={sendError}
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchResults={searchResults}
              searchPending={searchPending}
              refused={refused}
              onSendUserIds={onSendLookup}
            />
          ) : null}

          {canCopyInviteLink ? (
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
