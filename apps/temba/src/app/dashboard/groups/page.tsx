"use client";

import { PlusIcon, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { FormStrip } from "~/components/temba/form-strip";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { groupNextGameWeekday, groupRowMetaLine } from "~/lib/groups-list";
import { groupsTabFromQuery, groupsTabQuery } from "~/lib/groups-tab";
import { api, type RouterOutputs } from "~/trpc/react";

type GroupRow = RouterOutputs["groups"]["mine"][number];
type GroupInvite = RouterOutputs["groups"]["pendingLookupInvites"][number];
type PublicGroupRow = RouterOutputs["groups"]["listPublic"][number];

const CARD = "border-rule overflow-hidden rounded-[14px] border";

function GroupRowsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className={CARD}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="border-rule flex items-start justify-between gap-3.5 border-t p-5 first:border-t-0"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-4 w-32 max-w-full" />
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

function GroupRowCard({ groups }: { groups: GroupRow[] }) {
  return (
    <ul className={CARD}>
      {groups.map((group) => (
        <li key={group.id} className="border-rule border-t first:border-t-0">
          <Link
            href={`/dashboard/groups/${group.id}`}
            className="focus-visible:ring-ring/50 flex flex-col gap-3.5 p-5 outline-none focus-visible:ring-[3px]"
          >
            <div className="flex items-start justify-between gap-3.5">
              <div className="min-w-0">
                <p className="break-words text-[18px] font-semibold leading-6">
                  {group.name ?? "Untitled Group"}
                </p>
                <p className="text-meta text-muted-foreground mt-0.5 break-words">
                  {groupRowMetaLine({
                    memberCount: group.memberCount,
                    standingPosition: group.standingPosition,
                  })}
                </p>
              </div>
              <NextGameCell startTime={group.nextGameStartTime} />
            </div>

            {group.formMarks.length > 0 ? (
              <div className="flex items-center gap-2">
                <FormStrip marks={group.formMarks} size={18} gap={6} />
                <span className="text-eyebrow text-dim ml-auto">
                  your form here
                </span>
              </div>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
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
    <section className={CARD}>
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
                className="border-ink h-10 min-h-10 shrink-0 rounded-[10px] font-semibold"
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
    <section className="border-rule rounded-[14px] border p-5">
      <h2 className="text-body font-semibold">Start a group</h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        Pick a sport, invite players, and Temba keeps the standing and history.
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          asChild
          className="bg-ink text-paper hover:bg-dimrule h-11 flex-1 rounded-[10px] font-semibold"
        >
          <Link href="/dashboard/groups/new">Padel</Link>
        </Button>
        <span
          aria-disabled="true"
          className="hatch text-muted-foreground flex h-11 flex-1 items-center justify-center rounded-[10px] text-sm"
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
    <ul className={CARD}>
      {groups.map((group) => {
        const isPending = pendingGroupId === group.id;
        const members =
          group.memberCount === 1 ? "1 member" : `${group.memberCount} members`;
        const meta = group.requiresApproval
          ? `${members} · Requires approval`
          : members;
        return (
          <li
            key={group.id}
            className="border-rule flex items-center gap-3.5 border-t px-5 py-[18px] first:border-t-0"
          >
            <Link
              href={`/dashboard/groups/${group.id}`}
              className="focus-visible:ring-ring/50 min-w-0 flex-1 outline-none focus-visible:ring-[3px]"
            >
              <p className="break-words text-[18px] font-semibold leading-6">
                {group.name ?? "Untitled Group"}
              </p>
              {group.communityName ? (
                <p className="text-meta text-muted-foreground mt-0.5 break-words">
                  {group.communityName}
                </p>
              ) : null}
              <p className="text-meta text-muted-foreground mt-0.5 break-words">
                {meta}
              </p>
            </Link>
            <Button
              type="button"
              variant={group.joinMode === "join" ? "default" : "outline"}
              disabled={group.joinMode === "requested" || isPending}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (group.joinMode === "request") {
                  onRequest(group.id);
                  return;
                }
                if (group.joinMode === "join") {
                  onJoin(group);
                }
              }}
              className="h-10 min-h-10 shrink-0 rounded-[10px] font-semibold"
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
          </li>
        );
      })}
    </ul>
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
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/groups/new" aria-label="Create Group">
              <PlusIcon className="size-5" />
            </Link>
          </Button>
        ) : undefined
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="mt-4 gap-4">
        <TabsList className="bg-paper w-full justify-between">
          <TabsTrigger value="mine" className="w-1/2 rounded-r-none">
            Mine
          </TabsTrigger>
          <TabsTrigger value="public" className="w-1/2 rounded-l-none">
            Public
          </TabsTrigger>
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

            {showGroups ? <GroupRowCard groups={groupRows} /> : null}

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
