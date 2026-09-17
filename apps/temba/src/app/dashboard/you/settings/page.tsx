"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Users } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { PreferredPositionControl } from "~/components/settings/preferred-position-control";
import { SettingsFooter } from "~/components/settings/settings-footer";
import { SettingsLinkRow } from "~/components/settings/settings-link-row";
import { SettingsSection } from "~/components/settings/settings-section";
import { Skeleton } from "~/components/ui/skeleton";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { activeVenueCountLabel } from "~/lib/active-venue-count";
import { api } from "~/trpc/react";

const settingsPageClassName =
  "mx-auto flex min-h-[calc(100svh-var(--bottom-nav-height)-env(safe-area-inset-bottom,0px)-1.5rem)] w-full min-w-0 max-w-[1000px] flex-col md:min-h-[calc(100svh-3rem)]";

function SettingsHeader() {
  return (
    <header className="mt-6 flex items-center gap-1.5 lg:mt-2">
      <Link
        href="/dashboard/you"
        aria-label="Back to Profile"
        className="text-ink focus-visible:ring-ring/50 -ml-3 inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
      >
        <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
      </Link>
      <h1 className="text-ink text-[26px] font-bold tracking-[-0.01em]">
        Settings
      </h1>
    </header>
  );
}

function SettingsPageFrame({ children }: { children: ReactNode }) {
  return <div className={settingsPageClassName}>{children}</div>;
}

function SettingsLoadingBody() {
  return (
    <div aria-busy="true" className="flex flex-col gap-7 pt-[26px]">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-40 w-full rounded-[14px]" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <div className="border-rule overflow-hidden rounded-[14px] border">
          <Skeleton className="h-[72px] w-full rounded-none" />
          <Skeleton className="h-[72px] w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();
  const invites = usePendingInviteCount();
  const isOperator = user?.publicMetadata.operator === true;
  const teams = api.teams.mine.useQuery();
  const venues = api.venues.list.useQuery(undefined, { enabled: isOperator });

  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "You";
  const phoneNumber = user?.primaryPhoneNumber?.phoneNumber;
  const teamCount = teams.isSuccess ? teams.data.length : 0;
  const venueTrailing = venues.isSuccess
    ? activeVenueCountLabel(venues.data)
    : null;

  if (!isLoaded) {
    return (
      <DashboardShell width="content" hidePageHeader hideMobileTopBar>
        <SettingsPageFrame>
          <SettingsHeader />
          <SettingsLoadingBody />
        </SettingsPageFrame>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell width="content" hidePageHeader hideMobileTopBar>
      <SettingsPageFrame>
        <SettingsHeader />
        <div className="flex flex-col gap-7 pt-[26px]">
          <SettingsSection eyebrow="Playing">
            <PreferredPositionControl />
          </SettingsSection>

          <SettingsSection eyebrow="People">
            <SettingsLinkRow
              href="/dashboard/teams"
              icon={
                <Users aria-hidden="true" className="size-5" strokeWidth={2} />
              }
              title="Teams"
              subtitle="Partnerships you play as"
              trailing={
                teamCount > 0 ? (
                  <span className="text-muted-foreground text-meta shrink-0">
                    {teamCount}
                  </span>
                ) : null
              }
            />
            <SettingsLinkRow
              href="/dashboard/invites"
              icon={
                <Mail aria-hidden="true" className="size-5" strokeWidth={2} />
              }
              title="Invites"
              subtitle="Lookup invites addressed to you"
              trailing={
                invites.showCount ? (
                  <span
                    role="status"
                    aria-label={`${invites.count} pending invites`}
                    className="bg-ink text-paper flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[11px] px-[7px] text-xs font-semibold"
                  >
                    <span aria-hidden="true">{invites.count}</span>
                  </span>
                ) : invites.isLoading ? (
                  <Skeleton className="h-[22px] w-8 shrink-0 rounded-[11px]" />
                ) : null
              }
            />
          </SettingsSection>

          {isOperator ? (
            <SettingsSection eyebrow="Operator tools">
              <SettingsLinkRow
                href="/dashboard/venues"
                icon={
                  <Building2
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={2}
                  />
                }
                title="Venues"
                subtitle="Venue and Court catalogue"
                trailing={
                  venueTrailing ? (
                    <span className="text-muted-foreground text-meta shrink-0">
                      {venueTrailing}
                    </span>
                  ) : null
                }
              />
            </SettingsSection>
          ) : null}
        </div>

        <SettingsFooter
          displayName={displayName}
          phoneNumber={phoneNumber}
          onSignOut={() => {
            void clerk.signOut({ redirectUrl: "/login" });
          }}
        />
      </SettingsPageFrame>
    </DashboardShell>
  );
}
