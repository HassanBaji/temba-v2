"use client";

import { Plus, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  GROUP_UNLINK_ACTION_LABEL,
  VENUE_UNLINK_GROUP_TOAST,
  venueUnlinkGroupConfirm,
} from "@repo/domain/group-link-request";
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

import { LinkGroupSheet } from "./link-group-sheet";

function memberLabel(count: number) {
  return count === 1 ? "1 member" : `${count} members`;
}

export function VenueGroupsPage() {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [unlinkTarget, setUnlinkTarget] = React.useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const data = api.venues.listCommunityGroups.useQuery({ venueId: venue.id });

  const cancel = api.venues.cancelGroupLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success("Request cancelled");
      await utils.venues.listCommunityGroups.invalidate({ venueId: venue.id });
      await utils.venues.searchLinkableGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
      void data.refetch();
    },
  });

  const unlink = api.venues.unlinkGroup.useMutation({
    onSuccess: async () => {
      toast.success(VENUE_UNLINK_GROUP_TOAST);
      await utils.venues.listCommunityGroups.invalidate({ venueId: venue.id });
      await utils.venues.searchLinkableGroups.invalidate();
    },
    onError: () => {
      void data.refetch();
    },
  });

  const unlinkConfirm = unlinkTarget
    ? venueUnlinkGroupConfirm(unlinkTarget.name)
    : null;

  const archived = data.data?.venue.archived ?? false;

  return (
    <ConsolePage>
      <PageHeader
        title="Groups"
        description="Link a Group to bring its players into this Venue's Community. Linked Groups can host Rated Games and play at this Venue."
        action={
          <Button
            type="button"
            className="rounded-control h-10 min-h-10 px-4"
            disabled={archived}
            onClick={() => setLinkOpen(true)}
          >
            <Plus aria-hidden="true" className="size-[15px]" />
            Link a Group
          </Button>
        }
      />

      {data.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {data.error ? (
        <ErrorState
          title="Groups could not be loaded"
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
              title={data.data.community?.name ?? "Venue Community"}
              action={
                data.data.community?.archivedAt ? (
                  <Badge variant="secondary">Soft-archived</Badge>
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
                        name={group.name ?? "Untitled Group"}
                        size="lg"
                      />
                    }
                    title={group.name ?? "Untitled Group"}
                    meta={memberLabel(group.memberCount)}
                    trailing={
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Verified</Badge>
                        {group.canUnlink ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Unlink ${group.name ?? "Untitled Group"}`}
                            onClick={() =>
                              setUnlinkTarget({
                                id: group.id,
                                name: group.name,
                              })
                            }
                          >
                            {GROUP_UNLINK_ACTION_LABEL}
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
                title={
                  data.data.community ? "No Groups yet" : "No Community yet"
                }
                description={
                  data.data.community
                    ? "Groups that accept your request appear here."
                    : "It is created when the first Group accepts."
                }
              />
            )}
          </ConsoleCard>

          {data.data.pendingRequests.length > 0 ? (
            <ConsoleCard>
              <ConsoleCardHeader title="Waiting for a reply" />
              <RowList>
                {data.data.pendingRequests.map((request) => {
                  const name = request.group.name ?? "Untitled Group";
                  return (
                    <ListRow
                      key={request.id}
                      leading={<EntityMonogram name={name} size="lg" />}
                      title={name}
                      meta="Waiting for the Group creator"
                      trailing={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Cancel the request to ${name}`}
                          pending={
                            cancel.isPending &&
                            cancel.variables?.requestId === request.id
                          }
                          pendingLabel="Cancelling…"
                          disabled={cancel.isPending}
                          onClick={() =>
                            cancel.mutate({ requestId: request.id })
                          }
                        >
                          Cancel
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
              <ConsoleCardHeader title="Declined" />
              <RowList>
                {data.data.declinedRequests.map((request) => {
                  const name = request.group.name ?? "Untitled Group";
                  return (
                    <ListRow
                      key={request.id}
                      leading={<EntityMonogram name={name} size="lg" />}
                      title={name}
                      meta="The Group creator declined. You can send a new request."
                      trailing={<Badge variant="outline">Declined</Badge>}
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
