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
import { useMessages } from "~/components/locale-provider";
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
  const m = useMessages();
  const o = m.webDashboard.operator.groups;
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
      toast.success(variables.verified ? o.verifiedToast : o.unverifiedToast);
      await utils.groups.listForOperator.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <DashboardShell title={o.title} description={o.description}>
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="operator-group-search">
            {o.searchLabel}
          </FieldLabel>
          <Input
            id="operator-group-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={o.searchPlaceholder}
            maxLength={255}
            autoComplete="off"
          />
        </Field>

        {groups.isLoading ? <ListPageSkeleton rows={4} /> : null}

        {groups.error ? (
          <ErrorState
            title={m.webDashboard.groups.errorTitle}
            message={groups.error.message}
            onRetry={() => {
              void groups.refetch();
            }}
          />
        ) : null}

        {groups.data && rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={o.empty.title}
            description={debouncedQuery ? o.empty.tryOther : o.empty.none}
          />
        ) : null}

        {rows.length > 0 ? (
          <RowList>
            {rows.map((group) => {
              const name = group.name ?? m.group.untitled;
              const pending =
                setVerified.isPending &&
                setVerified.variables?.groupId === group.id;
              const verified = group.verificationSource === "operator";
              const viaVenueLink = group.verificationSource === "venue_link";
              return (
                <ListRow
                  key={group.id}
                  leading={<EntityMonogram name={name} size="lg" />}
                  title={name}
                  meta={
                    group.venueName ? o.linkedTo(group.venueName) : o.looseGroup
                  }
                  stackTrailing
                  trailing={
                    <div className="flex items-center gap-2">
                      {verified ? (
                        <Badge variant="secondary">{o.verified}</Badge>
                      ) : null}
                      {viaVenueLink ? (
                        <Badge variant="secondary">
                          {o.verifiedByVenue(group.venueName ?? "")}
                        </Badge>
                      ) : null}
                      {viaVenueLink ? null : verified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            setRemoveTarget({ id: group.id, name })
                          }
                        >
                          {o.removeVerification}
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
                          {o.verify}
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
            {m.common.showMore}
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
        title={o.removeConfirm.title(
          removeTarget?.name ?? m.group.linkRequest.thisGroup,
        )}
        description={o.removeConfirm.description}
        confirmLabel={o.removeVerification}
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
