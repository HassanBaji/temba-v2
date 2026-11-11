"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  MyGroupsEmpty,
  PublicGroupsEmpty,
} from "~/components/groups/groups-list-empty";
import {
  PendingInvitesSection,
  type PendingInviteRow,
} from "~/components/invites/pending-invites-section";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { FormStrip } from "~/components/temba/form-strip";
import { Button } from "~/components/ui/button";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  groupNextGameWeekday,
  groupRowMetaLine,
} from "@repo/domain/groups-list";
import { groupsTabFromQuery, groupsTabQuery } from "@repo/domain/groups-tab";
import {
  groupDisplayName,
  groupJoinDisabled,
  groupJoinLabel,
  groupJoinToast,
  publicGroupJoinDoor,
  publicGroupMetaLine,
} from "@repo/domain/group-join";
import { memberCountLabel } from "@repo/domain/member-count-label";
import {
  DEFAULT_PUBLIC_GROUP_SPORT_FILTER,
  PUBLIC_GROUP_SPORT_FILTERS,
  publicGroupSportFilterInput,
  publicGroupSportFilterLabel,
  sportLabel,
  type PublicGroupSportFilter,
} from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { RequestJoinDialog } from "~/components/groups/request-join-dialog";
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
  const m = useMessages();
  const locale = useLocale();
  const weekday = startTime ? groupNextGameWeekday(startTime, locale) : null;

  if (!weekday) {
    return (
      <span
        aria-hidden="true"
        className="hatch h-11 w-[52px] shrink-0 rounded-lg"
      />
    );
  }

  return (
    <div className="shrink-0 text-end">
      <p className="font-expanded text-[22px] leading-7">{weekday}</p>
      <p className="text-eyebrow text-muted-foreground">
        {m.webDashboard.groups.nextGame}
      </p>
    </div>
  );
}

function GroupRows({ groups }: { groups: GroupRow[] }) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <RowList variant="card">
      {groups.map((group) => {
        const name = groupDisplayName(group.name, locale);
        return (
          <ListRow
            key={group.id}
            asChild
            size="lg"
            leading={
              <EntityMonogram name={name} image={group.imageUrl} size="lg" />
            }
            eyebrow={sportLabel(group.sport, locale)}
            title={name}
            meta={groupRowMetaLine({
              memberCount: group.memberCount,
              standingPosition: group.standingPosition,
              locale,
            })}
            trailing={<NextGameCell startTime={group.nextGameStartTime} />}
            footer={
              group.formMarks.length > 0 ? (
                <div className="flex items-center gap-2">
                  <FormStrip marks={group.formMarks} size={18} gap={6} />
                  <span className="text-eyebrow text-muted-foreground ms-auto">
                    {m.webDashboard.groups.yourFormHere}
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

function toPendingInviteRow(
  invite: GroupInvite,
  locale: Locale,
): PendingInviteRow {
  const title = groupDisplayName(invite.groupName, locale);
  return {
    id: invite.id,
    leading: <EntityMonogram name={title} image={invite.imageUrl} size="lg" />,
    title,
    invitedBy: invite.invitedBy.name,
  };
}

function StartAGroupCard() {
  const m = useMessages();
  return (
    <section className="border-rule rounded-card border p-5">
      <h2 className="text-body font-semibold">
        {m.webDashboard.groups.start.title}
      </h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        {m.webDashboard.groups.start.description}
      </p>
      <div className="mt-4">
        <Button asChild className="w-full font-semibold">
          <Link href="/dashboard/groups/new">{m.home.noGames.createGroup}</Link>
        </Button>
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
  const locale = useLocale();
  return (
    <RowList variant="card">
      {groups.map((group) => {
        const name = groupDisplayName(group.name, locale);
        const isPending = pendingGroupId === group.id;
        const meta = publicGroupMetaLine({
          memberCountLabel: memberCountLabel(group.memberCount, locale),
          requiresApproval: group.requiresApproval,
          locale,
        });
        return (
          <ListRow
            key={group.id}
            size="lg"
            stackTrailing
            leading={
              <EntityMonogram name={name} image={group.imageUrl} size="lg" />
            }
            eyebrow={sportLabel(group.sport, locale)}
            title={
              <Link
                href={`/dashboard/groups/${group.id}`}
                className="focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-[3px]"
              >
                {name}
              </Link>
            }
            subtitle={group.venueName ?? undefined}
            meta={meta}
            trailing={
              <Button
                type="button"
                variant={group.joinMode === "join" ? "default" : "outline"}
                disabled={groupJoinDisabled(group.joinMode, false)}
                pending={isPending}
                onClick={() => {
                  const door = publicGroupJoinDoor(group);
                  if (door === "requestJoin") {
                    onRequest(group.id);
                  } else if (door) {
                    onJoin(group);
                  }
                }}
                className="font-semibold"
              >
                {groupJoinLabel(group.joinMode, isPending, "row", locale)}
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
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard/groups";
  const groups = api.groups.mine.useQuery();
  const [sportFilter, setSportFilter] = useState<PublicGroupSportFilter>(
    DEFAULT_PUBLIC_GROUP_SPORT_FILTER,
  );
  const publicGroups = api.groups.listPublic.useQuery(
    publicGroupSportFilterInput(sportFilter),
    { enabled: tab === "public" },
  );
  const invites = api.groups.pendingLookupInvites.useQuery();
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
      toast.success(m.group.join.toast.joined);
      await utils.groups.pendingLookupInvites.invalidate();
      await utils.groups.mine.invalidate();
      await utils.groups.listPublic.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinPublic = api.groups.joinPublic.useMutation({
    onSuccess: async () => {
      toast.success(groupJoinToast("joinPublic", locale));
      await utils.groups.listPublic.invalidate();
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(
    null,
  );
  const requestJoin = api.groups.requestJoin.useMutation({
    onSuccess: async () => {
      setRequestingGroupId(null);
      toast.success(groupJoinToast("requestJoin", locale));
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
    (joinPublic.isPending ? joinPublic.variables?.groupId : null) ??
    (requestJoin.isPending ? requestJoin.variables?.groupId : null) ??
    null;

  const groupRows = groups.data ?? [];
  const showGroups = groupRows.length > 0;
  const showNoGroups = groups.data != null && groupRows.length === 0;

  return (
    <DashboardShell
      title={m.common.groups}
      action={
        <PageCreateAction
          href="/dashboard/groups/new"
          label={m.home.noGames.createGroup}
        />
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="mt-4 gap-4">
        <TabsList variant="segmented">
          <TabsTrigger value="mine">
            {m.webDashboard.groups.tabs.mine}
          </TabsTrigger>
          <TabsTrigger value="public">
            {m.webDashboard.groups.tabs.public}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <div className="flex flex-col gap-[26px] py-2">
            {groups.isLoading ? <GroupRowsSkeleton /> : null}

            {groups.error ? (
              <ErrorState
                title={m.webDashboard.groups.errorTitle}
                error={groups.error}
                onRetry={() => {
                  void groups.refetch();
                }}
              />
            ) : null}

            {showGroups ? <GroupRows groups={groupRows} /> : null}

            {showNoGroups ? (
              <MyGroupsEmpty onBrowsePublic={() => setTab("public")} />
            ) : null}

            <PendingInvitesSection
              variant="card"
              invites={invites.data?.map((invite) =>
                toPendingInviteRow(invite, locale),
              )}
              pendingId={pendingInviteId}
              error={invites.error}
              onAccept={(inviteId) => {
                acceptInvite.mutate({ inviteId });
              }}
              onRetry={() => {
                void invites.refetch();
              }}
            />

            {showNoGroups ? null : <StartAGroupCard />}
          </div>
        </TabsContent>

        <TabsContent value="public">
          <div className="flex flex-col gap-[26px] py-2">
            <RovingRadioGroup
              aria-label={m.webDashboard.groups.filterBySport}
              className="flex flex-wrap gap-2"
            >
              {PUBLIC_GROUP_SPORT_FILTERS.map((filter) => (
                <ChoiceChip
                  key={filter}
                  role="radio"
                  selected={sportFilter === filter}
                  onClick={() => setSportFilter(filter)}
                >
                  {publicGroupSportFilterLabel(filter, locale)}
                </ChoiceChip>
              ))}
            </RovingRadioGroup>

            {publicGroups.isLoading ? <GroupRowsSkeleton /> : null}

            {publicGroups.error ? (
              <ErrorState
                title={m.webDashboard.groups.publicErrorTitle}
                error={publicGroups.error}
                onRetry={() => {
                  void publicGroups.refetch();
                }}
              />
            ) : null}

            {publicGroups.data && publicGroups.data.length > 0 ? (
              <PublicGroupRows
                groups={publicGroups.data}
                pendingGroupId={pendingPublicGroupId}
                onJoin={(group) => joinPublic.mutate({ groupId: group.id })}
                onRequest={setRequestingGroupId}
              />
            ) : null}

            {!publicGroups.isLoading &&
            !publicGroups.error &&
            publicGroups.data?.length === 0 ? (
              <PublicGroupsEmpty sportFilter={sportFilter} />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      <RequestJoinDialog
        open={requestingGroupId != null}
        onOpenChange={(open) => {
          if (!open) {
            setRequestingGroupId(null);
          }
        }}
        pending={requestJoin.isPending}
        onSend={(note) => {
          if (requestingGroupId) {
            requestJoin.mutate({
              groupId: requestingGroupId,
              note: note.trim() || undefined,
            });
          }
        }}
      />
    </DashboardShell>
  );
}
