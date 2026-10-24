"use client";

import { Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
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

export default function OperatorGroupsPage() {
  const utils = api.useUtils();
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const [removeTarget, setRemoveTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const groups = api.groups.listForOperator.useInfiniteQuery(
    { query: debouncedQuery || undefined },
    { getNextPageParam: (page) => page.nextCursor },
  );
  const rows = groups.data?.pages.flatMap((page) => page.items) ?? [];

  const setVerified = api.groups.setVerified.useMutation({
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.verified ? "Group verified" : "Verification removed",
      );
      await utils.groups.listForOperator.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <DashboardShell
      title="Verify Groups"
      description="Only a Verified Group can host Rated Games and open a Game to anyone with the link. Removing verification leaves existing Games unchanged."
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="operator-group-search">Search Groups</FieldLabel>
          <Input
            id="operator-group-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Group name"
            maxLength={255}
            autoComplete="off"
          />
        </Field>

        {groups.isLoading ? <ListPageSkeleton rows={4} /> : null}

        {groups.error ? (
          <ErrorState
            title="Groups could not be loaded"
            message={groups.error.message}
            onRetry={() => {
              void groups.refetch();
            }}
          />
        ) : null}

        {groups.data && rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Groups found"
            description={
              debouncedQuery
                ? "Try a different name."
                : "Groups will show up here once they are created."
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <RowList>
            {rows.map((group) => {
              const name = group.name ?? "Untitled Group";
              const pending =
                setVerified.isPending &&
                setVerified.variables?.groupId === group.id;
              const verified = group.verificationSource === "operator";
              return (
                <ListRow
                  key={group.id}
                  leading={<EntityMonogram name={name} size="lg" />}
                  title={name}
                  meta={
                    group.communityName
                      ? `Club Group of ${group.communityName}${group.communityArchived ? " (Soft-archived)" : ""}`
                      : "Loose Group"
                  }
                  stackTrailing
                  trailing={
                    <div className="flex items-center gap-2">
                      {verified ? (
                        <Badge variant="secondary">Verified</Badge>
                      ) : null}
                      {verified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            setRemoveTarget({ id: group.id, name })
                          }
                        >
                          Remove verification
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            setVerified.mutate({
                              groupId: group.id,
                              verified: true,
                            })
                          }
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  }
                />
              );
            })}
          </RowList>
        ) : null}

        {groups.hasNextPage ? (
          <Button
            variant="outline"
            disabled={groups.isFetchingNextPage}
            onClick={() => {
              void groups.fetchNextPage();
            }}
          >
            Show more
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
        title={`Remove verification from ${removeTarget?.name ?? "this Group"}?`}
        description="Existing Games keep their Rated and public settings. New Games in this Group will be Unrated and private."
        confirmLabel="Remove verification"
        pending={setVerified.isPending}
        onConfirm={async () => {
          if (!removeTarget) {
            return;
          }
          await setVerified.mutateAsync({
            groupId: removeTarget.id,
            verified: false,
          });
          setRemoveTarget(null);
        }}
      />
    </DashboardShell>
  );
}
