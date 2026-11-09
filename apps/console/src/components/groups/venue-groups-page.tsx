"use client";

import { Plus, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { venueUnlinkGroupConfirm } from "@repo/domain/group-link-request";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { ConsolePage } from "~/components/console/console-page";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { PageHeader } from "~/components/console/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useLocale, useMessages } from "~/components/locale-provider";

import { LinkGroupSheet } from "./link-group-sheet";

export function VenueGroupsPage() {
  const messages = useMessages();
  const m = messages.group.linkRequest;
  const g = messages.consoleVenue.groups;
  const locale = useLocale();
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [unlinkTarget, setUnlinkTarget] = React.useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const data = api.venues.listLinkedGroups.useQuery({ venueId: venue.id });

  const cancel = api.venues.cancelGroupLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success(g.cancelledToast);
      await utils.venues.listLinkedGroups.invalidate({ venueId: venue.id });
      await utils.venues.searchLinkableGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
      void data.refetch();
    },
  });

  const unlink = api.venues.unlinkGroup.useMutation({
    onSuccess: async () => {
      toast.success(m.venueUnlinkedToast);
      await utils.venues.listLinkedGroups.invalidate({ venueId: venue.id });
      await utils.venues.searchLinkableGroups.invalidate();
    },
    onError: () => {
      void data.refetch();
    },
  });

  const unlinkConfirm = unlinkTarget
    ? venueUnlinkGroupConfirm(unlinkTarget.name, locale)
    : null;

  const archived = data.data?.venue.archived ?? false;

  return (
    <ConsolePage>
      <PageHeader
        title={g.title}
        description={g.description}
        action={
          <Button
            type="button"
            className="rounded-control h-10 min-h-10 px-4"
            disabled={archived}
            onClick={() => setLinkOpen(true)}
          >
            <Plus aria-hidden="true" className="size-[15px]" />
            {g.link}
          </Button>
        }
      />

      {data.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {data.error ? (
        <ErrorState
          title={g.loadError}
          message={data.error.message}
          onRetry={() => {
            void data.refetch();
          }}
        />
      ) : null}

      {data.data ? (
        <div className="space-y-[22px]">
          <ConsoleCard>
            <ConsoleCardHeader
              title={g.linked}
              action={
                archived ? (
                  <Badge variant="secondary">{g.softArchived}</Badge>
                ) : undefined
              }
            />
            {data.data.groups.length > 0 ? (
              <RowList>
                {data.data.groups.map((group) => (
                  <ListRow
                    key={group.id}
                    leading={
                      <EntityMonogram
                        name={group.name ?? g.untitled}
                        size="lg"
                      />
                    }
                    title={group.name ?? g.untitled}
                    meta={g.members(group.memberCount)}
                    trailing={
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{g.verified}</Badge>
                        {group.canUnlink ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={g.unlinkNamed(group.name ?? g.untitled)}
                            onClick={() =>
                              setUnlinkTarget({
                                id: group.id,
                                name: group.name,
                              })
                            }
                          >
                            {m.unlinkLabel}
                          </Button>
                        ) : null}
                      </div>
                    }
                  />
                ))}
              </RowList>
            ) : (
              <EmptyState
                icon={Users}
                headingLevel={3}
                title={g.emptyTitle}
                description={g.emptyDescription}
              />
            )}
          </ConsoleCard>

          {data.data.pendingRequests.length > 0 ? (
            <ConsoleCard>
              <ConsoleCardHeader title={g.waiting} />
              <RowList>
                {data.data.pendingRequests.map((request) => {
                  const name = request.group.name ?? g.untitled;
                  return (
                    <ListRow
                      key={request.id}
                      leading={<EntityMonogram name={name} size="lg" />}
                      title={name}
                      meta={g.waitingForCreator}
                      trailing={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={g.cancelRequest(name)}
                          pending={
                            cancel.isPending &&
                            cancel.variables?.requestId === request.id
                          }
                          pendingLabel={g.cancelling}
                          disabled={cancel.isPending}
                          onClick={() =>
                            cancel.mutate({ requestId: request.id })
                          }
                        >
                          {g.cancel}
                        </Button>
                      }
                    />
                  );
                })}
              </RowList>
            </ConsoleCard>
          ) : null}

          {data.data.declinedRequests.length > 0 ? (
            <ConsoleCard>
              <ConsoleCardHeader title={g.declined} />
              <RowList>
                {data.data.declinedRequests.map((request) => {
                  const name = request.group.name ?? g.untitled;
                  return (
                    <ListRow
                      key={request.id}
                      leading={<EntityMonogram name={name} size="lg" />}
                      title={name}
                      meta={g.declinedMeta}
                      trailing={<Badge variant="outline">{g.declined}</Badge>}
                    />
                  );
                })}
              </RowList>
            </ConsoleCard>
          ) : null}
        </div>
      ) : null}

      {unlinkConfirm ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setUnlinkTarget(null);
            }
          }}
          title={unlinkConfirm.title}
          description={unlinkConfirm.description}
          confirmLabel={unlinkConfirm.confirmLabel}
          cancelLabel={unlinkConfirm.cancelLabel}
          pending={unlink.isPending}
          onConfirm={async () => {
            if (unlinkTarget) {
              await unlink.mutateAsync({
                venueId: venue.id,
                groupId: unlinkTarget.id,
              });
            }
          }}
        />
      ) : null}

      <LinkGroupSheet
        venueId={venue.id}
        open={linkOpen}
        onOpenChange={setLinkOpen}
      />
    </ConsolePage>
  );
}
