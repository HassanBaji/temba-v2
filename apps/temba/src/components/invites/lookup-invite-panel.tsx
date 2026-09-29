"use client";

import * as React from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { RowList } from "~/components/common/row-list";
import { LookupUserSelect } from "~/components/invites/lookup-user-select";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import type { LookupListItem } from "~/server/invites/doors";
import type { LookupUserSearchRow } from "~/server/invites/search-lookup-users";

export function LookupInvitePanel({
  lookupInvites,
  sendPending,
  revokePendingId,
  sendError,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searchPending,
  refused,
  selection = "multiple",
  canSend = true,
  compact = false,
  onSendUserIds,
  onRevokeLookup,
}: {
  lookupInvites?: LookupListItem[];
  sendPending: boolean;
  revokePendingId?: string;
  sendError?: { message: string; data?: { zodError?: unknown } | null } | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: LookupUserSearchRow[] | undefined;
  searchPending?: boolean;
  refused?: { name: string; message: string }[] | null;
  selection?: "multiple" | "single";
  canSend?: boolean;
  compact?: boolean;
  onSendUserIds: (userIds: string[]) => void;
  onRevokeLookup?: (inviteId: string) => void;
}) {
  const queryId = React.useId();
  const queryErrorId = `${queryId}-error`;
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const queryError = fieldErrorMessage(
    sendError,
    selection === "single" ? "userId" : "userIds",
  );
  const formError = globalFormErrorMessage(sendError);
  const [selected, setSelected] = React.useState<LookupUserSearchRow[]>([]);
  const [revokeTarget, setRevokeTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = React.useState(false);

  React.useEffect(() => {
    if (!sendError) {
      return;
    }
    focusFormFailure(
      sendError,
      { userIds: queryId, userId: queryId },
      summaryRef.current,
    );
  }, [sendError, queryId]);

  React.useEffect(() => {
    if (sendPending || refused == null) {
      return;
    }
    setSelected([]);
  }, [sendPending, refused]);

  return (
    <section className="space-y-4">
      <FormErrorSummary ref={summaryRef} message={formError} />
      {refused && refused.length > 0 ? (
        <ul className="text-destructive text-meta space-y-1">
          {refused.map((item) => (
            <li key={`${item.name}-${item.message}`}>
              {item.name}: {item.message}
            </li>
          ))}
        </ul>
      ) : null}
      {canSend ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (sendPending || selected.length === 0) {
              return;
            }
            onSendUserIds(selected.map((row) => row.id));
          }}
        >
          <Field>
            <FieldLabel
              htmlFor={queryId}
              className={compact ? "sr-only" : undefined}
            >
              {selection === "single" ? "User" : "Users"}
            </FieldLabel>
            <LookupUserSelect
              id={queryId}
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              options={searchResults}
              selected={selected}
              onSelectedChange={(val) => setSelected(val)}
              selection={selection}
              pending={searchPending}
              disabled={sendPending}
              error={Boolean(queryError)}
              describedBy={queryError ? queryErrorId : undefined}
              placeholder={compact ? "Search" : undefined}
            />
            <FieldError id={queryErrorId}>{queryError}</FieldError>
          </Field>
          <Button type="submit" disabled={sendPending || selected.length === 0}>
            {sendPending ? "Sending…" : compact ? "Send" : "Send Lookup invite"}
          </Button>
        </form>
      ) : null}
      {!compact && lookupInvites?.length === 0 ? (
        <p className="text-body text-muted-foreground">
          No unused Lookup invites.
        </p>
      ) : null}
      {lookupInvites && lookupInvites.length > 0 && !compact ? (
        <RowList>
          {lookupInvites.map((invite) => {
            const name = invite.user.name ?? "User";
            return (
              <li
                key={invite.id}
                className="flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lead font-semibold">{name}</p>
                  <p className="text-meta text-muted-foreground">
                    {invite.user.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  aria-label={`Revoke invite for ${name}`}
                  onClick={() => {
                    setRevokeTarget({ id: invite.id, name });
                    setConfirmRevokeOpen(true);
                  }}
                  pending={revokePendingId === invite.id}
                  pendingLabel="Revoking…"
                >
                  Revoke
                </Button>
              </li>
            );
          })}
        </RowList>
      ) : null}
      <ConfirmDialog
        open={confirmRevokeOpen}
        onOpenChange={setConfirmRevokeOpen}
        title={`Revoke the invite for ${revokeTarget?.name ?? "User"}?`}
        description="They can no longer accept it."
        confirmLabel="Revoke"
        onConfirm={() => {
          if (revokeTarget) {
            onRevokeLookup?.(revokeTarget.id);
          }
        }}
      />
    </section>
  );
}
