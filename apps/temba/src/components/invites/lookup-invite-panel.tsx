"use client";

import * as React from "react";

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

export function LookupInvitePanel({
  description,
  lookupInvites,
  sendPending,
  revokePending,
  sendError,
  onSendLookup,
  onRevokeLookup,
}: {
  description: React.ReactNode;
  lookupInvites: LookupInvite[] | undefined;
  sendPending: boolean;
  revokePending: boolean;
  sendError?: { message: string; data?: { zodError?: unknown } | null } | null;
  onSendLookup: (query: string) => void;
  onRevokeLookup: (inviteId: string) => void;
}) {
  const queryId = React.useId();
  const queryErrorId = `${queryId}-error`;
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const queryError = fieldErrorMessage(sendError, "query");
  const formError = globalFormErrorMessage(sendError);

  React.useEffect(() => {
    if (!sendError) {
      return;
    }
    focusFormFailure(sendError, { query: queryId }, summaryRef.current);
  }, [sendError, queryId]);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-title font-semibold">Lookup invite</h3>
        <p className="text-body text-muted-foreground mt-1">{description}</p>
      </div>
      <FormErrorSummary ref={summaryRef} message={formError} />
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
          onSendLookup(query);
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
        </ul>
      ) : null}
    </section>
  );
}
