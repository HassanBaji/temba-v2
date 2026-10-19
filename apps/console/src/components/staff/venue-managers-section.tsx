"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function VenueManagersSection({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const managers = api.venues.managedById.useQuery({ venueId });
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const [removeUserId, setRemoveUserId] = React.useState<string | null>(null);

  const search = api.venues.searchManagerUsers.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  const addManager = api.venues.addManager.useMutation({
    onSuccess: async () => {
      toast.success("Venue manager added");
      setQuery("");
      await utils.venues.managedById.invalidate({ venueId });
      await utils.venues.listManaged.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeManager = api.venues.removeManager.useMutation({
    onSuccess: async () => {
      toast.success("Venue manager removed");
      await utils.venues.managedById.invalidate({ venueId });
      await utils.venues.listManaged.invalidate();
    },
  });

  const current = managers.data?.managers ?? [];
  const currentIds = new Set(current.map((manager) => manager.userId));
  const candidates = (search.data ?? []).filter(
    (row) => !currentIds.has(row.id),
  );
  const removeName =
    current.find((manager) => manager.userId === removeUserId)?.name ??
    "this User";

  return (
    <Section
      title="Venue managers"
      description="Users who run this Venue from the Manage area. Only Operators can grant or revoke."
    >
      {managers.error ? (
        <ErrorState
          headingLevel={3}
          title="Venue managers could not be loaded"
          message={managers.error.message}
          onRetry={() => {
            void managers.refetch();
          }}
        />
      ) : null}

      {managers.data && current.length === 0 ? (
        <p className="text-body text-muted-foreground">
          No Venue managers yet.
        </p>
      ) : null}

      {current.length > 0 ? (
        <RowList>
          {current.map((manager) => (
            <ListRow
              key={manager.id}
              leading={
                <EntityMonogram name={manager.name} image={manager.image} />
              }
              title={manager.name}
              meta={manager.username ? `@${manager.username}` : undefined}
              trailing={
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Remove ${manager.name}`}
                  onClick={() => setRemoveUserId(manager.userId)}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </RowList>
      ) : null}

      <Field>
        <FieldLabel htmlFor="venue-manager-search">
          Add a Venue manager
        </FieldLabel>
        <Input
          id="venue-manager-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, username, email or phone"
          maxLength={100}
          autoComplete="off"
        />
      </Field>

      {debouncedQuery.length > 0 && search.data && candidates.length === 0 ? (
        <p className="text-body text-muted-foreground">No Users found.</p>
      ) : null}

      {candidates.length > 0 ? (
        <RowList>
          {candidates.map((candidate) => (
            <ListRow
              key={candidate.id}
              leading={
                <EntityMonogram name={candidate.name} image={candidate.image} />
              }
              title={candidate.name}
              meta={candidate.username ? `@${candidate.username}` : undefined}
              trailing={
                <Button
                  type="button"
                  aria-label={`Add ${candidate.name} as Venue manager`}
                  pending={
                    addManager.isPending &&
                    addManager.variables?.userId === candidate.id
                  }
                  pendingLabel="Adding…"
                  disabled={addManager.isPending}
                  onClick={() =>
                    addManager.mutate({ venueId, userId: candidate.id })
                  }
                >
                  Add
                </Button>
              }
            />
          ))}
        </RowList>
      ) : null}

      <ConfirmDialog
        open={removeUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveUserId(null);
          }
        }}
        title={`Remove ${removeName}?`}
        description="They lose access to this Venue's Manage area."
        confirmLabel="Remove Venue manager"
        pending={removeManager.isPending}
        onConfirm={async () => {
          if (!removeUserId) {
            return;
          }
          await removeManager.mutateAsync({ venueId, userId: removeUserId });
        }}
      />
    </Section>
  );
}
