"use client";

import * as React from "react";

import { RowList } from "~/components/common/row-list";
import {
  LookupUserSelect,
  type LookupUserOption,
} from "~/components/invites/lookup-user-select";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";

type LookupInvite = {
  id: string;
  user: { name: string | null; email: string | null };
};

export function LookupInvitePanel({
  description,
  lookupInvites,
  sendPending,
  revokePending,
  sendError,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searchPending,
  refused,
  selection = "multiple",
  onSendUserIds,
  onRevokeLookup,
}: {
  description: React.ReactNode;
  lookupInvites: LookupInvite[] | undefined;
  sendPending: boolean;
  revokePending: boolean;
  sendError?: { message: string; data?: { zodError?: unknown } | null } | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: LookupUserOption[] | undefined;
  searchPending?: boolean;
  refused?: { name: string; message: string }[] | null;
  selection?: "multiple" | "single";
  onSendUserIds: (userIds: string[]) => void;
  onRevokeLookup: (inviteId: string) => void;
}) {
  const queryId = React.useId();
  const queryErrorId = `${queryId}-error`;
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const queryError = fieldErrorMessage(
    sendError,
    selection === "single" ? "userId" : "userIds",
  );
  const formError = globalFormErrorMessage(sendError);
  const [selected, setSelected] = React.useState<LookupUserOption[]>([]);

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
      <div>
        <h3 className="text-title font-semibold">Lookup invite</h3>
        <p className="text-body text-muted-foreground mt-1">{description}</p>
      </div>
      <FormErrorSummary ref={summaryRef} message={formError} />
      {refused && refused.length > 0 ? (
        <ul className="text-destructive space-y-1 text-sm">
          {refused.map((item) => (
            <li key={`${item.name}-${item.message}`}>
              {item.name}: {item.message}
            </li>
          ))}
        </ul>
      ) : null}
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
          <FieldLabel htmlFor={queryId}>
            {selection === "single" ? "User" : "Users"}
          </FieldLabel>
          <LookupUserSelect
            id={queryId}
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            options={searchResults}
            selected={selected}
            onSelectedChange={setSelected}
            selection={selection}
            pending={searchPending}
            disabled={sendPending}
            error={Boolean(queryError)}
            describedBy={queryError ? queryErrorId : undefined}
          />
          <FieldError id={queryErrorId}>{queryError}</FieldError>
        </Field>
        <Button type="submit" disabled={sendPending || selected.length === 0}>
          {sendPending ? "Sending…" : "Send Lookup invite"}
        </Button>
      </form>
      {lookupInvites?.length === 0 ? (
        <p className="text-body text-muted-foreground">
          No unused Lookup invites.
        </p>
      ) : null}
      {lookupInvites && lookupInvites.length > 0 ? (
        <RowList>
          {lookupInvites.map((invite) => (
            <li
              key={invite.id}
              className="flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-lead font-semibold">
                  {invite.user.name ?? "User"}
                </p>
                <p className="text-meta text-muted-foreground">
                  {invite.user.email}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onRevokeLookup(invite.id)}
                disabled={revokePending}
              >
                Revoke
              </Button>
            </li>
          ))}
        </RowList>
      ) : null}
    </section>
  );
}
