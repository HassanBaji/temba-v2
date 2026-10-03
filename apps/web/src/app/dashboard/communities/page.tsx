"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  clubGroupRowMetaLine,
  communityListMetaLine,
} from "~/lib/community-chrome";
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
  const name = group.name ?? "Untitled Group";
  return (
    <li className="border-rule border-t">
      <Link
        href={`/dashboard/groups/${group.id}`}
        className={`${rowLink} px-5 py-[18px]`}
      >
        <EntityMonogram name={name} image={group.imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-body break-words">{name}</p>
          <p className="text-meta text-muted-foreground">
            {clubGroupRowMetaLine({
              type: group.type,
              memberCount: group.memberCount,
            })}
          </p>
        </div>
        {group.isMember ? (
          <span className="text-eyebrow text-muted-foreground shrink-0">
            Joined
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function CommunityCard({ community }: { community: CommunityRow }) {
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
            })}
          </p>
          {community.archivedAt ? (
            <Badge variant="outline" className="mt-2">
              Soft-archived
            </Badge>
          ) : null}
        </div>
      </Link>
      <ul>
        {community.groups.length === 0 ? (
          <li className="border-rule text-meta text-muted-foreground border-t px-5 py-[18px]">
            No Groups yet
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
  return (
    <section className="border-rule rounded-[14px] border p-5">
      <h2 className="text-body font-semibold">Start a Community</h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        Communities organise Club Groups around a Venue.
      </p>
      <Button
        asChild
        className="bg-ink text-paper hover:bg-dimrule mt-4 h-11 w-full rounded-[10px] font-semibold"
      >
        <Link href="/dashboard/communities/new">Create Community</Link>
      </Button>
    </section>
  );
}

export default function CommunitiesPage() {
  const { isLoaded, hasCreateAccess } = useCreateAccess();
  const mine = api.communities.mine.useQuery(undefined, {
    enabled: isLoaded && hasCreateAccess,
  });

  if (!isLoaded) {
    return (
      <DashboardShell title="Communities">
        <CommunitiesListSkeleton />
      </DashboardShell>
    );
  }

  if (!hasCreateAccess) {
    return (
      <DashboardShell title="Communities">
        <EmptyState
          icon={Lock}
          title="Communities list is limited"
          description="This list is set up by Temba staff."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to Home</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Communities"
      action={
        <PageCreateAction
          href="/dashboard/communities/new"
          label="Create Community"
        />
      }
    >
      <div className="flex flex-col gap-[26px]">
        {mine.isLoading ? <CommunitiesListSkeleton /> : null}

        {mine.error ? (
          <ErrorState
            title="Communities could not be loaded"
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
