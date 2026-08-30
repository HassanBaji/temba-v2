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
import { Input } from "~/components/ui/input";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";

type LookupInvite = {
  id: string;
  user: { name: string | null; email: string | null };
};

type LookupInvitePanelBase = {
  description: React.ReactNode;
  lookupInvites: LookupInvite[] | undefined;
  sendPending: boolean;
  revokePending: boolean;
  sendError?: { message: string; data?: { zodError?: unknown } | null } | null;
  onRevokeLookup: (inviteId: string) => void;
};

type LookupInvitePanelExactMatch = LookupInvitePanelBase & {
  onSendLookup: (query: string) => void;
};

type LookupInvitePanelSearch = LookupInvitePanelBase & {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: LookupUserOption[] | undefined;
  searchPending?: boolean;
  refused?: { name: string; message: string }[] | null;
  onSendUserIds: (userIds: string[]) => void;
};

function isSearchPanel(
  props: LookupInvitePanelExactMatch | LookupInvitePanelSearch,
): props is LookupInvitePanelSearch {
  return "searchQuery" in props;
}

export function LookupInvitePanel(
  props: LookupInvitePanelExactMatch | LookupInvitePanelSearch,
) {
  const {
    description,
    lookupInvites,
    sendPending,
    revokePending,
    sendError,
    onRevokeLookup,
  } = props;
  const search = isSearchPanel(props);
  const queryId = React.useId();
  const queryErrorId = `${queryId}-error`;
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const queryError = fieldErrorMessage(sendError, search ? "userIds" : "query");
  const formError = globalFormErrorMessage(sendError);
  const [selected, setSelected] = React.useState<LookupUserOption[]>([]);
  const refused = search ? props.refused : undefined;

  React.useEffect(() => {
    if (!sendError) {
      return;
    }
    focusFormFailure(
      sendError,
      search ? { userIds: queryId } : { query: queryId },
      summaryRef.current,
    );
  }, [sendError, queryId, search]);

  React.useEffect(() => {
    if (!search || sendPending || refused == null) {
      return;
    }
    setSelected([]);
  }, [search, sendPending, refused]);

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
      {search ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (sendPending || selected.length === 0) {
              return;
            }
            props.onSendUserIds(selected.map((row) => row.id));
          }}
        >
          <Field>
            <FieldLabel htmlFor={queryId}>Users</FieldLabel>
            <LookupUserSelect
              id={queryId}
              query={props.searchQuery}
              onQueryChange={props.onSearchQueryChange}
              options={props.searchResults}
              selected={selected}
              onSelectedChange={setSelected}
              pending={props.searchPending}
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
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (sendPending) {
              return;
            }
            const formData = new FormData(event.currentTarget);
            const queryValue = formData.get("query");
            if (typeof queryValue !== "string") {
              return;
            }
            const query = queryValue.trim();
            if (!query) {
              return;
            }
            props.onSendLookup(query);
            event.currentTarget.reset();
          }}
        >
          <Field>
            <FieldLabel htmlFor={queryId}>Username, email, or phone</FieldLabel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Input
                id={queryId}
                name="query"
                type="text"
                required
                className="flex-1"
                aria-invalid={queryError ? true : undefined}
                aria-describedby={queryError ? queryErrorId : undefined}
              />
              <Button type="submit" disabled={sendPending}>
                {sendPending ? "Sending…" : "Send Lookup invite"}
              </Button>
            </div>
            <FieldError id={queryErrorId}>{queryError}</FieldError>
          </Field>
        </form>
      )}
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
