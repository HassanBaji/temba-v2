"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { communityListMetaLine } from "@repo/domain/community-chrome";
import { communityClubGroupRow } from "@repo/domain/community";
import { api, type RouterOutputs } from "~/trpc/react";

type CommunityRow = RouterOutputs["communities"]["mine"][number];
type ClubGroupRow = CommunityRow["groups"][number];

const communityCard = "border-rule overflow-hidden rounded-[14px] border";
const rowLink =
  "focus-visible:ring-ring/50 hover:bg-muted/50 flex w-full min-w-0 items-center gap-3.5 outline-none focus-visible:ring-[3px] focus-visible:ring-inset";

function CommunitiesListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[26px]">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className={communityCard}>
          <div className="flex items-center gap-3.5 p-5">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
            </div>
          </div>
          {Array.from({ length: 2 }).map((__, rowIndex) => (
            <div
              key={rowIndex}
              className="border-rule flex items-center gap-3.5 border-t px-5 py-[18px]"
            >
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="h-3 w-28 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ClubGroupRowLink({ group }: { group: ClubGroupRow }) {
  const m = useMessages();
  const locale = useLocale();
  const row = communityClubGroupRow(group, locale);
  return (
    <li className="border-rule border-t">
      <Link
        href={`/dashboard/groups/${row.id}`}
        className={`${rowLink} px-5 py-[18px]`}
      >
        <EntityMonogram name={row.name} image={row.imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-body break-words">{row.name}</p>
          <p className="text-meta text-muted-foreground">{row.meta}</p>
        </div>
        {row.joined ? (
          <span className="text-eyebrow text-muted-foreground shrink-0">
            {m.community.joined}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function CommunityCard({ community }: { community: CommunityRow }) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <li className={communityCard}>
      <Link
        href={`/dashboard/communities/${community.id}`}
        className={`${rowLink} p-5`}
      >
        <EntityMonogram
          name={community.name}
          image={community.logoImageUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="break-words text-[18px] font-semibold leading-6">
            {community.name}
          </p>
          <p className="text-meta text-muted-foreground mt-0.5">
            {communityListMetaLine({
              type: community.type,
              memberCount: community.memberCount,
              role: community.role,
              locale,
            })}
          </p>
          {community.archivedAt ? (
            <Badge variant="outline" className="mt-2">
              {m.community.badge.softArchived}
            </Badge>
          ) : null}
        </div>
      </Link>
      <ul>
        {community.groups.length === 0 ? (
          <li className="border-rule text-meta text-muted-foreground border-t px-5 py-[18px]">
            {m.community.noGroups}
          </li>
        ) : (
          community.groups.map((group) => (
            <ClubGroupRowLink key={group.id} group={group} />
          ))
        )}
      </ul>
    </li>
  );
}

function StartACommunityCard() {
  const m = useMessages();
  return (
    <section className="border-rule rounded-[14px] border p-5">
      <h2 className="text-body font-semibold">{m.community.start.title}</h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        {m.community.start.description}
      </p>
      <Button
        asChild
        className="bg-ink text-paper hover:bg-dimrule mt-4 h-11 w-full rounded-[10px] font-semibold"
      >
        <Link href="/dashboard/communities/new">
          {m.community.start.action}
        </Link>
      </Button>
    </section>
  );
}

export default function CommunitiesPage() {
  const m = useMessages();
  const { isLoaded, hasCreateAccess } = useCreateAccess();
  const mine = api.communities.mine.useQuery(undefined, {
    enabled: isLoaded && hasCreateAccess,
  });

  if (!isLoaded) {
    return (
      <DashboardShell title={m.common.communities}>
        <CommunitiesListSkeleton />
      </DashboardShell>
    );
  }

  if (!hasCreateAccess) {
    return (
      <DashboardShell title={m.common.communities}>
        <EmptyState
          icon={Lock}
          title={m.webDashboard.communities.limited.title}
          description={m.webDashboard.communities.limited.description}
          action={
            <Button asChild>
              <Link href="/dashboard">{m.webDashboard.backToHome}</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={m.common.communities}
      action={
        <PageCreateAction
          href="/dashboard/communities/new"
          label={m.community.start.action}
        />
      }
    >
      <div className="flex flex-col gap-[26px]">
        {mine.isLoading ? <CommunitiesListSkeleton /> : null}

        {mine.error ? (
          <ErrorState
            title={m.community.errorTitle}
            message={mine.error.message}
            onRetry={() => {
              void mine.refetch();
            }}
          />
        ) : null}

        {mine.data && mine.data.length > 0 ? (
          <ul className="flex flex-col gap-[26px]">
            {mine.data.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </ul>
        ) : null}

        {mine.data && !mine.error ? <StartACommunityCard /> : null}
      </div>
    </DashboardShell>
  );
}
