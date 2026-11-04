"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Building2, FileText, Mail, Users } from "lucide-react";
import type { ReactNode } from "react";

import { LanguageToggle } from "~/components/common/language-toggle";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { PageTitle } from "~/components/layout/page-title";
import { PreferredPositionControl } from "~/components/settings/preferred-position-control";
import { SettingsFooter } from "~/components/settings/settings-footer";
import { SettingsLinkRow } from "~/components/settings/settings-link-row";
import { SettingsSection } from "~/components/settings/settings-section";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { activeVenueCountLabel } from "@repo/domain/active-venue-count";
import { api } from "~/trpc/react";

const settingsPageClassName =
  "mx-auto flex min-h-[calc(100svh-var(--bottom-nav-height)-env(safe-area-inset-bottom,0px)-1.5rem)] w-full min-w-0 max-w-[1000px] flex-col md:min-h-[calc(100svh-3rem)]";

function SettingsHeader() {
  const m = useMessages();
  return (
    <header className="mt-6 flex items-center gap-1.5 lg:mt-2">
      <BackButton
        href="/dashboard/you"
        label={m.webDashboard.settings.backToProfile}
      />
      <PageTitle className="text-ink">{m.common.settings}</PageTitle>
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
        <Skeleton className="rounded-card h-40 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <div className="border-rule rounded-card overflow-hidden border">
          <Skeleton className="h-[72px] w-full rounded-none" />
          <Skeleton className="h-[72px] w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const m = useMessages();
  const locale = useLocale();
  const { isLoaded, user } = useUser();
  const clerk = useClerk();
  const invites = usePendingInviteCount();
  const isOperator = user?.publicMetadata.operator === true;
  const teams = api.teams.mine.useQuery();
  const venues = api.venues.list.useQuery(undefined, { enabled: isOperator });

  const displayName =
    user?.fullName ?? user?.firstName ?? user?.username ?? m.common.you;
  const phoneNumber = user?.primaryPhoneNumber?.phoneNumber;
  const teamCount = teams.isSuccess ? teams.data.length : 0;
  const venueTrailing = venues.isSuccess
    ? activeVenueCountLabel(venues.data, locale)
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
          <SettingsSection eyebrow={m.webDashboard.settings.playing}>
            <PreferredPositionControl />
          </SettingsSection>

          <SettingsSection eyebrow={m.webDashboard.settings.people}>
            <SettingsLinkRow
              href="/dashboard/teams"
              icon={
                <Users aria-hidden="true" className="size-5" strokeWidth={2} />
              }
              title={m.common.teams}
              subtitle={m.team.description}
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
              title={m.common.invites}
              subtitle={m.webDashboard.settings.invitesSubtitle}
              trailing={
                invites.showCount ? (
                  <span
                    role="status"
                    aria-label={m.webDashboard.settings.pendingInvites(
                      invites.count,
                    )}
                    className="bg-ink text-paper text-eyebrow flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-[7px] font-semibold"
                  >
                    <span aria-hidden="true">{invites.count}</span>
                  </span>
                ) : invites.isLoading ? (
                  <Skeleton className="h-[22px] w-8 shrink-0 rounded-full" />
                ) : null
              }
            />
          </SettingsSection>

          <SettingsSection eyebrow={m.common.language}>
            <LanguageToggle />
          </SettingsSection>

          <SettingsSection eyebrow={m.webDashboard.settings.about}>
            <SettingsLinkRow
              href="/terms"
              icon={
                <FileText
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2}
                />
              }
              title={m.webDashboard.settings.terms}
              subtitle={m.webDashboard.settings.termsSubtitle}
            />
          </SettingsSection>

          {isOperator ? (
            <SettingsSection eyebrow={m.webDashboard.settings.operatorTools}>
              <SettingsLinkRow
                href="/dashboard/venues"
                icon={
                  <Building2
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={2}
                  />
                }
                title={m.webDashboard.meta.venues}
                subtitle={m.webDashboard.settings.venuesSubtitle}
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
          onSignOut={() => clerk.signOut({ redirectUrl: "/login" })}
        />
      </SettingsPageFrame>
    </DashboardShell>
  );
}
