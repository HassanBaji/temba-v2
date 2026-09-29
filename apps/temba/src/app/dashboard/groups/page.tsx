"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { FormStrip } from "~/components/temba/form-strip";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { groupNextGameWeekday, groupRowMetaLine } from "~/lib/groups-list";
import { groupsTabFromQuery, groupsTabQuery } from "~/lib/groups-tab";
import { cardFrame } from "~/lib/page-layout";
import { api, type RouterOutputs } from "~/trpc/react";

type GroupRow = RouterOutputs["groups"]["mine"][number];
type GroupInvite = RouterOutputs["groups"]["pendingLookupInvites"][number];
type PublicGroupRow = RouterOutputs["groups"]["listPublic"][number];

function GroupRowsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className={cardFrame}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="border-rule flex items-center justify-between gap-3 border-t px-5 py-4 first:border-t-0"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-11 w-[52px] shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function NextGameCell({ startTime }: { startTime: Date | string | null }) {
  const weekday = startTime ? groupNextGameWeekday(startTime) : null;

  if (!weekday) {
    return (
      <span
        aria-hidden="true"
        className="hatch h-11 w-[52px] shrink-0 rounded-lg"
      />
    );
  }

  return (
    <div className="shrink-0 text-right">
      <p className="font-expanded text-[22px] leading-7">{weekday}</p>
      <p className="text-eyebrow text-muted-foreground">next game</p>
    </div>
  );
}

function GroupRows({ groups }: { groups: GroupRow[] }) {
  return (
    <RowList variant="card">
      {groups.map((group) => {
        const name = group.name ?? "Untitled Group";
        return (
          <ListRow
            key={group.id}
            asChild
            size="lg"
            leading={
              <EntityMonogram name={name} image={group.imageUrl} size="lg" />
            }
            title={name}
            meta={groupRowMetaLine({
              memberCount: group.memberCount,
              standingPosition: group.standingPosition,
            })}
            trailing={<NextGameCell startTime={group.nextGameStartTime} />}
            footer={
              group.formMarks.length > 0 ? (
                <div className="flex items-center gap-2">
                  <FormStrip marks={group.formMarks} size={18} gap={6} />
                  <span className="text-eyebrow text-muted-foreground ml-auto">
                    your form here
                  </span>
                </div>
              ) : undefined
            }
          >
            <Link href={`/dashboard/groups/${group.id}`} />
          </ListRow>
        );
      })}
    </RowList>
  );
}

function InvitationsCard({
  invites,
  pendingInviteId,
  onAccept,
}: {
  invites: GroupInvite[];
  pendingInviteId: string | null;
  onAccept: (inviteId: string) => void;
}) {
  return (
    <section className={cardFrame}>
      <h2 className="text-meta text-muted-foreground border-rule border-b px-5 py-4">
        Invitations
      </h2>
      <ul>
        {invites.map((invite) => {
          const isPending = pendingInviteId === invite.id;
          return (
            <li
              key={invite.id}
              className="border-rule flex items-center gap-3.5 border-t px-5 py-[18px] first:border-t-0"
            >
              <EntityMonogram
                name={invite.groupName ?? "Untitled Group"}
                image={invite.imageUrl}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-body break-words">
                  {invite.groupName ?? "Untitled Group"}
                </p>
                <p className="text-meta text-muted-foreground break-words">
                  Invited by {invite.invitedBy.name}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  onAccept(invite.id);
                }}
                className="border-ink shrink-0 rounded-md font-semibold"
              >
                {isPending ? "Joining" : "Join"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StartAGroupCard() {
  return (
    <section className="border-rule rounded-card border p-5">
      <h2 className="text-body font-semibold">Start a group</h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        Pick a sport, invite players, and Temba keeps the standing and history.
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild className="flex-1 font-semibold">
          <Link href="/dashboard/groups/new">Padel</Link>
        </Button>
        <span
          aria-disabled="true"
          className="hatch text-muted-foreground text-body flex h-11 flex-1 items-center justify-center rounded-md"
        >
          Football
        </span>
      </div>
    </section>
  );
}

function PublicGroupRows({
  groups,
  pendingGroupId,
  onJoin,
  onRequest,
}: {
  groups: PublicGroupRow[];
  pendingGroupId: string | null;
  onJoin: (group: PublicGroupRow) => void;
  onRequest: (groupId: string) => void;
}) {
  return (
    <RowList variant="card">
      {groups.map((group) => {
        const name = group.name ?? "Untitled Group";
        const isPending = pendingGroupId === group.id;
        const members =
          group.memberCount === 1 ? "1 member" : `${group.memberCount} members`;
        const meta = group.requiresApproval
          ? `${members} · Requires approval`
          : members;
        return (
          <ListRow
            key={group.id}
            size="lg"
            stackTrailing
            leading={
              <EntityMonogram name={name} image={group.imageUrl} size="lg" />
            }
            title={
              <Link
                href={`/dashboard/groups/${group.id}`}
                className="focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-[3px]"
              >
                {name}
              </Link>
            }
            subtitle={group.communityName ?? undefined}
            meta={meta}
            trailing={
              <Button
                type="button"
                variant={group.joinMode === "join" ? "default" : "outline"}
                disabled={group.joinMode === "requested"}
                pending={isPending}
                onClick={() => {
                  if (group.joinMode === "request") {
                    onRequest(group.id);
                    return;
                  }
                  if (group.joinMode === "join") {
                    onJoin(group);
                  }
                }}
                className="font-semibold"
              >
                {group.joinMode === "requested"
                  ? "Requested"
                  : group.joinMode === "request"
                    ? isPending
                      ? "Requesting…"
                      : "Request to join"
                    : isPending
                      ? "Joining…"
                      : "Join"}
              </Button>
            }
          />
        );
      })}
    </RowList>
  );
}

export default function GroupsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = groupsTabFromQuery(tabParam);
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard/groups";
  const groups = api.groups.mine.useQuery();
  const publicGroups = api.groups.listPublic.useQuery(undefined, {
    enabled: tab === "public",
  });
  const invites = api.groups.pendingLookupInvites.useQuery();
  const { hasCreateAccess } = useCreateAccess();
  const utils = api.useUtils();

  function setTab(next: string) {
    const resolved = groupsTabFromQuery(next);
    if (resolved === tab) {
      return;
    }
    router.replace(`${pathname}${groupsTabQuery(resolved)}`, {
      scroll: false,
    });
  }

  const acceptInvite = api.groups.acceptLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.pendingLookupInvites.invalidate();
      await utils.groups.mine.invalidate();
      await utils.groups.listPublic.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinLoosePublic = api.groups.joinLoosePublic.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.listPublic.invalidate();
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinClubPublic = api.groups.joinClubPublic.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.listPublic.invalidate();
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestJoin = api.groups.requestJoin.useMutation({
    onSuccess: async () => {
      toast.success("Requested to join");
      await utils.groups.listPublic.invalidate();
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const pendingInviteId = acceptInvite.isPending
    ? (acceptInvite.variables?.inviteId ?? null)
    : null;
  const pendingPublicGroupId =
    (joinLoosePublic.isPending ? joinLoosePublic.variables?.groupId : null) ??
    (joinClubPublic.isPending ? joinClubPublic.variables?.groupId : null) ??
    (requestJoin.isPending ? requestJoin.variables?.groupId : null) ??
    null;

  const groupRows = groups.data ?? [];
  const inviteRows = invites.data ?? [];
  const showGroups = groupRows.length > 0;
  const showInvites = inviteRows.length > 0;
  const showEmpty =
    !groups.isLoading &&
    !groups.error &&
    !invites.isLoading &&
    !showGroups &&
    !showInvites &&
    !hasCreateAccess;

  return (
    <DashboardShell
      title="Groups"
      action={
        hasCreateAccess ? (
          <PageCreateAction href="/dashboard/groups/new" label="Create Group" />
        ) : undefined
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="mt-4 gap-4">
        <TabsList variant="segmented">
          <TabsTrigger value="mine">Mine</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <div className="flex flex-col gap-[26px] py-2">
            {groups.isLoading ? <GroupRowsSkeleton /> : null}

            {groups.error ? (
              <ErrorState
                title="Groups could not be loaded"
                message={groups.error.message}
                onRetry={() => {
                  void groups.refetch();
                }}
              />
            ) : null}

            {showGroups ? <GroupRows groups={groupRows} /> : null}

            {showInvites ? (
              <InvitationsCard
                invites={inviteRows}
                pendingInviteId={pendingInviteId}
                onAccept={(inviteId) => {
                  acceptInvite.mutate({ inviteId });
                }}
              />
            ) : null}

            {hasCreateAccess ? <StartAGroupCard /> : null}

            {showEmpty ? (
              <EmptyState
                icon={Users}
                title="No Groups yet"
                description="Groups are where you play and where your Standing lives."
              />
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="public">
          <div className="flex flex-col gap-[26px] py-2">
            {publicGroups.isLoading ? <GroupRowsSkeleton /> : null}

            {publicGroups.error ? (
              <ErrorState
                title="Public Groups could not be loaded"
                message={publicGroups.error.message}
                onRetry={() => {
                  void publicGroups.refetch();
                }}
              />
            ) : null}

            {publicGroups.data && publicGroups.data.length > 0 ? (
              <PublicGroupRows
                groups={publicGroups.data}
                pendingGroupId={pendingPublicGroupId}
                onJoin={(group) => {
                  if (group.communityName) {
                    joinClubPublic.mutate({ groupId: group.id });
                    return;
                  }
                  joinLoosePublic.mutate({ groupId: group.id });
                }}
                onRequest={(groupId) => {
                  requestJoin.mutate({ groupId });
                }}
              />
            ) : null}

            {!publicGroups.isLoading &&
            !publicGroups.error &&
            publicGroups.data?.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No public Groups to join right now."
              />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
