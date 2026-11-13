"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  Bell,
  Building2,
  CalendarClock,
  FileText,
  Flag,
  KeyRound,
  Mail,
  MailCheck,
  Plus,
  Smartphone,
  Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { AppearanceControl } from "~/components/settings/appearance-control";
import { LanguageControl } from "~/components/settings/language-control";
import { PasswordDialog } from "~/components/settings/password-dialog";
import {
  SettingsButtonRow,
  SettingsLinkRow,
  SettingsStaticRow,
} from "~/components/settings/settings-link-row";
import { profileCompletion } from "~/components/settings/settings-model";
import {
  AVAILABILITY_PATH,
  DETAILS_PATH,
  photoHref,
  SETTINGS_PATH,
  SettingsScreen,
} from "~/components/settings/settings-screen";
import { SettingsSection } from "~/components/settings/settings-section";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { profileAvatarClassName } from "~/components/you/you-header";
import { SPORT_SETTINGS_HREF } from "~/components/you/you-chips";
import { bandInText, displayBand } from "~/components/you/you-format";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { OPERATOR_DISPUTES_HREF } from "~/lib/dashboard-paths";
import { profileTaskHref } from "~/lib/onboarding-step";
import { cn } from "~/lib/utils";
import { activeVenueCountLabel } from "@repo/domain/active-venue-count";
import { footballRoleView } from "@repo/domain/player-profile-football";
import { preferredPositionLabel } from "@repo/domain/preferred-position";
import { playWindowsSummary } from "@repo/domain/profile-details";
import { SPORTS, type Sport } from "@repo/domain/sport";
import { api, type RouterOutputs } from "~/trpc/react";

type Details = RouterOutputs["users"]["profileDetails"];

const iconProps = {
  "aria-hidden": true,
  className: "size-5",
  strokeWidth: 2,
} as const;

const COMPLETION_HREF = {
  photo: photoHref(SETTINGS_PATH),
  email: profileTaskHref("email", SETTINGS_PATH),
  sports: SPORT_SETTINGS_HREF.padel,
  details: DETAILS_PATH,
  playWindows: AVAILABILITY_PATH,
} as const;

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="bg-control text-on-control text-eyebrow flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-[7px] font-semibold"
    >
      <span aria-hidden="true">{count}</span>
    </span>
  );
}

function CompleteProfileCard({
  details,
  user,
}: {
  details: Details;
  user: NonNullable<ReturnType<typeof useUser>["user"]>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.settings;
  const completion = profileCompletion(
    {
      hasName: Boolean(user.firstName && user.lastName),
      hasPhone: user.primaryPhoneNumber != null,
      hasPhoto: user.hasImage,
      emailVerified:
        user.primaryEmailAddress?.verification.status === "verified",
      sportCount: details.sports.length,
      gender: details.gender,
      birthDate: details.birthDate,
      homeArea: details.homeArea,
      playWindowCount: details.playWindows.length,
    },
    locale,
  );
  const first = completion.missing[0];
  const body = (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-body text-ink font-semibold">
          {copy.completeProfile}
        </span>
        <span className="text-muted-foreground font-mono text-[10px] tracking-[0.04em]">
          {copy.countOf(completion.done, completion.total)}
        </span>
      </span>
      <span aria-hidden="true" className="mt-3 flex gap-1">
        {Array.from({ length: completion.total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full",
              index < completion.done ? "bg-ink" : "bg-wash",
            )}
          />
        ))}
      </span>
      <span className="text-eyebrow text-muted-foreground mt-2.5 block">
        {completion.left ?? copy.allDone}
      </span>
    </>
  );
  const className =
    "border-rule bg-paper rounded-card block border px-4 py-3.5";

  return first ? (
    <Link
      href={COMPLETION_HREF[first]}
      className={cn(
        className,
        "hover:bg-wash focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function SportBadge({ band }: { band: string | null }) {
  if (band) {
    return (
      <span
        aria-hidden="true"
        dir="ltr"
        className="bg-control text-on-control text-meta flex size-9 items-center justify-center rounded-[9px] font-semibold"
      >
        {band}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="border-rule text-muted-foreground relative flex size-9 items-center justify-center overflow-hidden rounded-[9px] border"
    >
      <span className="hatch absolute inset-0" />
      <Plus className="relative size-4" strokeWidth={2} />
    </span>
  );
}

function SportProfiles({ details }: { details: Details }) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.settings;
  const hasPadel = details.sports.includes("padel");
  const hasFootball = details.sports.includes("football");
  const padel = api.users.myProfile.useQuery(
    { sport: "padel" },
    { enabled: hasPadel },
  );
  const football = api.ratings.me.useQuery(
    { sport: "football" },
    { enabled: hasFootball },
  );

  const side = preferredPositionLabel(details.preferredPosition, locale);
  const padelLevel = padel.data?.level ?? null;
  const footballRating = football.data?.rating ?? null;
  const footballOvr = football.data?.ovr;
  const footballLevel =
    footballOvr != null
      ? m.rating.ovr.value(String(footballOvr))
      : m.you.hero.noLevel;
  const role = footballRoleView(
    {
      role: details.preferredFootballRole,
      position: details.preferredFootballPosition,
    },
    locale,
  ).label;

  const rows: Record<
    Sport,
    { set: boolean; band: string | null; sub: string }
  > = {
    padel: {
      set: hasPadel,
      band: padelLevel ? displayBand(padelLevel.levelBand) : null,
      sub: padelLevel
        ? copy.padelSub(
            bandInText(
              `${displayBand(padelLevel.levelBand)} ${padelLevel.rating.toFixed(2)}`,
              locale,
            ),
            side,
          )
        : copy.padelSubNoLevel(side),
    },
    football: {
      set: hasFootball,
      band: footballRating ? displayBand(footballRating.levelBand) : null,
      sub: copy.footballSub(footballLevel, role),
    },
  };

  return (
    <SettingsSection eyebrow={copy.sportProfiles}>
      {SPORTS.map((sport) => {
        const row = rows[sport];
        return (
          <SettingsLinkRow
            key={sport}
            href={SPORT_SETTINGS_HREF[sport]}
            icon={
              <SportBadge
                band={row.set ? (row.band ?? m.webYou.noData) : null}
              />
            }
            title={m.common[sport]}
            subtitle={row.set ? row.sub : copy.notSetUp}
            trailing={
              row.set ? null : (
                <span className="bg-control text-on-control text-meta shrink-0 rounded-full px-3 py-1 font-semibold">
                  {copy.setUp}
                </span>
              )
            }
          />
        );
      })}
    </SettingsSection>
  );
}

function SeatAlertsRow({ details }: { details: Details }) {
  const m = useMessages();
  const copy = m.you.settings;
  const utils = api.useUtils();
  const save = api.users.setPlayWindows.useMutation({
    onMutate: ({ seatAlerts }) => {
      utils.users.profileDetails.setData(undefined, (old) =>
        old ? { ...old, seatAlerts } : old,
      );
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
    onSettled: async () => {
      await utils.users.profileDetails.invalidate();
    },
  });
  const titleId = "settings-seat-alerts";

  return (
    <SettingsStaticRow
      icon={<Bell {...iconProps} />}
      title={<span id={titleId}>{copy.seatAlerts}</span>}
      subtitle={copy.seatAlertsSub}
      trailing={
        <Switch
          aria-labelledby={titleId}
          checked={details.seatAlerts}
          disabled={save.isPending}
          onCheckedChange={(seatAlerts) =>
            save.mutate({ playWindows: details.playWindows, seatAlerts })
          }
        />
      }
    />
  );
}

function EmailNotificationsRow({
  details,
  emailVerified,
}: {
  details: Details;
  emailVerified: boolean;
}) {
  const m = useMessages();
  const copy = m.you.settings;
  const utils = api.useUtils();
  const save = api.users.setEmailNotifications.useMutation({
    onMutate: ({ emailNotifications }) => {
      utils.users.profileDetails.setData(undefined, (old) =>
        old ? { ...old, emailNotifications } : old,
      );
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
    onSettled: async () => {
      await utils.users.profileDetails.invalidate();
    },
  });
  const titleId = "settings-email-notifications";

  return (
    <SettingsStaticRow
      icon={<MailCheck {...iconProps} />}
      title={<span id={titleId}>{copy.emailNotifications}</span>}
      subtitle={
        emailVerified ? (
          copy.emailNotificationsSub
        ) : (
          <span className="block whitespace-normal">
            {copy.emailNotificationsNeedEmail}{" "}
            <Link
              href={COMPLETION_HREF.email}
              className="text-ink focus-visible:ring-ring/50 rounded-sm underline underline-offset-4 outline-none focus-visible:ring-[3px]"
            >
              {copy.emailNotificationsAddEmail}
            </Link>
          </span>
        )
      }
      trailing={
        <Switch
          aria-labelledby={titleId}
          checked={details.emailNotifications}
          disabled={save.isPending}
          onCheckedChange={(emailNotifications) =>
            save.mutate({ emailNotifications })
          }
        />
      }
    />
  );
}

function HubSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-7 lg:grid-cols-2">
      {[0, 1].map((column) => (
        <div key={column} className="flex flex-col gap-7">
          <Skeleton className="rounded-card h-[72px] w-full" />
          <Skeleton className="rounded-card h-24 w-full" />
          <Skeleton className="rounded-card h-40 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Settings: one hub for everything sign up collects, account and app. */
export function SettingsHub() {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.settings;
  const { isLoaded, user } = useUser();
  const clerk = useClerk();
  const invites = usePendingInviteCount();
  const details = api.users.profileDetails.useQuery();
  const isOperator = user?.publicMetadata.operator === true;
  const teams = api.teams.mine.useQuery();
  const venues = api.venues.list.useQuery(undefined, { enabled: isOperator });
  const passwordButton = React.useRef<HTMLDivElement>(null);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const ready = isLoaded && user && details.data;

  return (
    <SettingsScreen
      title={copy.title}
      backHref="/dashboard/you"
      backLabel={m.webDashboard.settings.backToProfile}
      width="hub"
    >
      {!ready ? (
        <HubSkeleton />
      ) : (
        <div className="grid gap-7 lg:grid-cols-2 lg:items-start">
          <div className="flex min-w-0 flex-col gap-7">
            <div className="flex flex-col gap-3">
              <SettingsSection>
                <SettingsLinkRow
                  href={DETAILS_PATH}
                  icon={
                    <UserAvatar
                      name={user.fullName ?? details.data.name}
                      image={user.hasImage ? user.imageUrl : null}
                      className={profileAvatarClassName}
                    />
                  }
                  title={user.fullName ?? details.data.name}
                  subtitle={copy.detailsSub}
                />
              </SettingsSection>
              <CompleteProfileCard details={details.data} user={user} />
            </div>

            <SportProfiles details={details.data} />

            <SettingsSection eyebrow={copy.account}>
              <SettingsStaticRow
                icon={<Smartphone {...iconProps} />}
                title={copy.mobileNumber}
                subtitle={
                  <span dir="ltr">
                    {user.primaryPhoneNumber?.phoneNumber ??
                      details.data.phoneNumber ??
                      m.common.notSet}
                  </span>
                }
              />
              <SettingsLinkRow
                href={COMPLETION_HREF.email}
                icon={<Mail {...iconProps} />}
                title={copy.email}
                subtitle={
                  user.primaryEmailAddress?.emailAddress ?? copy.noEmail
                }
                trailing={
                  user.primaryEmailAddress?.verification.status ===
                  "verified" ? null : (
                    <span className="border-ink text-ink shrink-0 rounded-[5px] border px-1.5 font-mono text-[10px] uppercase">
                      {copy.verify}
                    </span>
                  )
                }
              />
              <div ref={passwordButton}>
                <SettingsButtonRow
                  icon={<KeyRound {...iconProps} />}
                  title={copy.password}
                  subtitle={copy.passwordSub}
                  onClick={() => setPasswordOpen(true)}
                />
              </div>
            </SettingsSection>

            <SettingsSection eyebrow={copy.playing}>
              <SettingsLinkRow
                href={AVAILABILITY_PATH}
                icon={<CalendarClock {...iconProps} />}
                title={copy.whenYouPlay}
                subtitle={
                  playWindowsSummary(details.data.playWindows, locale) ??
                  copy.whenYouPlayUnset
                }
              />
              <SeatAlertsRow details={details.data} />
              <EmailNotificationsRow
                details={details.data}
                emailVerified={
                  user.primaryEmailAddress?.verification.status === "verified"
                }
              />
            </SettingsSection>
          </div>

          <div className="flex min-w-0 flex-col gap-7">
            <SettingsSection eyebrow={copy.peopleAndBookings}>
              <SettingsLinkRow
                href="/dashboard/teams"
                icon={<Users {...iconProps} />}
                title={copy.teams}
                subtitle={copy.teamsSub}
                trailing={
                  teams.isSuccess && teams.data.length > 0 ? (
                    <span className="text-muted-foreground text-meta shrink-0">
                      {teams.data.length}
                    </span>
                  ) : null
                }
              />
              <SettingsLinkRow
                href="/dashboard/invites"
                icon={<Mail {...iconProps} />}
                title={copy.invites}
                subtitle={copy.invitesSub}
                trailing={
                  invites.showCount ? (
                    <CountBadge
                      count={invites.count}
                      label={m.webDashboard.settings.pendingInvites(
                        invites.count,
                      )}
                    />
                  ) : invites.isLoading ? (
                    <Skeleton className="h-[22px] w-8 shrink-0 rounded-full" />
                  ) : null
                }
              />
            </SettingsSection>

            {isOperator ? (
              <SettingsSection eyebrow={m.webDashboard.settings.operatorTools}>
                <SettingsLinkRow
                  href="/dashboard/venues"
                  icon={<Building2 {...iconProps} />}
                  title={m.webDashboard.meta.venues}
                  subtitle={m.webDashboard.settings.venuesSubtitle}
                  trailing={
                    venues.isSuccess ? (
                      <span className="text-muted-foreground text-meta shrink-0">
                        {activeVenueCountLabel(venues.data, locale)}
                      </span>
                    ) : null
                  }
                />
                <SettingsLinkRow
                  href={OPERATOR_DISPUTES_HREF}
                  icon={<Flag {...iconProps} />}
                  title={m.rating.dispute.operator.title}
                  subtitle={m.rating.dispute.operator.settingsSubtitle}
                />
              </SettingsSection>
            ) : null}

            <SettingsSection eyebrow={copy.language}>
              <LanguageControl />
            </SettingsSection>

            <SettingsSection eyebrow={copy.appearance.title}>
              <AppearanceControl />
            </SettingsSection>
            <p className="text-muted-foreground text-meta -mt-3 px-1">
              {copy.appearance.shareNote}
            </p>

            <SettingsSection eyebrow={copy.about}>
              <SettingsLinkRow
                href="/terms"
                icon={<FileText {...iconProps} />}
                title={copy.terms}
              />
            </SettingsSection>

            <div className="flex flex-col items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                pending={signingOut}
                pendingLabel={m.webAuth.settings.signingOut}
                onClick={() => {
                  setSigningOut(true);
                  void clerk
                    .signOut({ redirectUrl: "/login" })
                    .catch(() => setSigningOut(false));
                }}
              >
                {copy.signOut}
              </Button>
              <Button
                type="button"
                variant="link"
                className="text-destructive min-h-11 no-underline hover:underline"
                onClick={() => setDeleteOpen(true)}
              >
                {copy.deleteAccount}
              </Button>
            </div>
          </div>

          <PasswordDialog
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
            user={user}
            restoreFocusRef={passwordButton}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={copy.deleteTitle}
            description={copy.deleteBody}
            confirmLabel={copy.deleteConfirm}
            cancelLabel={copy.cancel}
            onConfirm={async () => {
              await user.delete();
              window.location.assign("/login");
            }}
          />
        </div>
      )}
    </SettingsScreen>
  );
}
