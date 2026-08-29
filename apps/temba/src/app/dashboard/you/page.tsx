"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Building2, Mail, Users } from "lucide-react";

import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { Section } from "~/components/layout/section";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";

function YouPageSkeleton({ showOperator }: { showOperator: boolean }) {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="h-3 w-28 max-w-full" />
        </div>
        <Skeleton className="size-8 shrink-0 rounded-full" />
      </div>
      <div className="divide-border overflow-hidden rounded-lg border">
        <Skeleton className="h-16 w-full rounded-none" />
        <Skeleton className="h-16 w-full rounded-none" />
        {showOperator ? (
          <Skeleton className="h-16 w-full rounded-none" />
        ) : null}
      </div>
    </div>
  );
}

export default function YouPage() {
  const { isLoaded, user } = useUser();
  const invites = usePendingInviteCount();
  const isOperator = user?.publicMetadata.operator === true;
  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "You";
  const username = user?.username;
  const image = user?.imageUrl;

  if (!isLoaded) {
    return (
      <DashboardShell title="You">
        <YouPageSkeleton showOperator={false} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="You">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UserAvatar name={displayName} image={image} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lead truncate font-semibold">{displayName}</p>
            {username ? (
              <p className="text-meta text-muted-foreground truncate">
                @{username}
              </p>
            ) : null}
          </div>
          <UserButton />
        </div>

        <RowList>
          <ListRow
            asChild
            leading={
              <Users aria-hidden="true" className="size-5" strokeWidth={2} />
            }
            title="Teams"
            meta="Partnerships you play as"
          >
            <Link href="/dashboard/teams" />
          </ListRow>
          <ListRow
            asChild
            leading={
              <Mail aria-hidden="true" className="size-5" strokeWidth={2} />
            }
            title="Invites"
            meta="Lookup invites addressed to you"
            trailing={
              invites.showCount ? (
                <span
                  role="status"
                  aria-label={`${invites.count} pending invites`}
                >
                  <Badge aria-hidden="true">{invites.count}</Badge>
                </span>
              ) : invites.isLoading ? (
                <Skeleton className="h-5 w-8 rounded-full" />
              ) : null
            }
          >
            <Link href="/dashboard/invites" />
          </ListRow>
        </RowList>

        {isOperator ? (
          <Section title="Operator tools">
            <RowList>
              <ListRow
                asChild
                leading={
                  <Building2
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={2}
                  />
                }
                title="Venues"
                meta="Venue and Court catalogue"
              >
                <Link href="/dashboard/venues" />
              </ListRow>
            </RowList>
          </Section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
