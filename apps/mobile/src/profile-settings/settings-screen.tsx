import { useAuth, useUser } from "@clerk/expo";
import { colors, radii } from "@repo/design-tokens";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import {
  isFootballPosition,
  isFootballRole,
} from "@repo/domain/football-lineup";
import { playWindowsSummary } from "@repo/domain/profile-details";
import { LOCALES, LOCALE_LABELS } from "@repo/i18n/locale";
import { useRouter } from "expo-router";
import {
  Bell,
  CalendarClock,
  Calendar,
  FileText,
  KeyRound,
  Mail,
  MailCheck,
  MailOpen,
  Plus,
  Smartphone,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { Block } from "../home/slot-block";
import {
  useLocale,
  useLocaleSwitch,
  useMessages,
} from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { displayBand, sportProfilePath } from "../profile/profile-model";
import { ChecklistSegments } from "../profile-tasks/checklist-marks";
import {
  checklistFrom,
  profileTaskPath,
  settingsChecklist,
} from "../profile-tasks/profile-tasks-model";
import { api, type RouterOutputs } from "../trpc/react";
import {
  displayPhone,
  footballSportSub,
  hasDetails,
  padelSportSub,
} from "./settings-model";
import {
  CountBadge,
  Segmented,
  SettingsGroup,
  SettingsRow,
  SwitchRow,
  TagBox,
} from "./settings-rows";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const BADGE = 32;

type Details = RouterOutputs["users"]["profileDetails"];

function SportBadge({ label }: { label: string | null }) {
  if (!label) {
    return (
      <View
        style={{
          width: BADGE,
          height: BADGE,
          borderRadius: radii.sm,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: hairline,
          borderColor: colors.rule,
        }}
      >
        <Hatch radius={radii.sm} bordered={false} />
        <Plus size={14} color={colors.muted} />
      </View>
    );
  }
  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        style={{
          width: BADGE,
          height: BADGE,
          borderRadius: radii.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.ink,
        }}
      >
        <Text size="meta" weight="bold" width="expanded">
          {label}
        </Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

function SetUpPill({ label }: { label: string }) {
  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radii.lg,
          backgroundColor: colors.ink,
        }}
      >
        <Text size="eyebrow" weight="semibold">
          {label}
        </Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

function LanguageGroup() {
  const m = useMessages();
  const { locale, setLocale, restartNeeded } = useLocaleSwitch();
  return (
    <View style={{ gap: 10 }}>
      <Text
        size="eyebrow"
        tone="muted"
        mono
        uppercase
        accessibilityRole="header"
      >
        {m.you.settings.language}
      </Text>
      <Segmented
        label={m.you.settings.language}
        options={LOCALES.map((value) => ({
          value,
          label: LOCALE_LABELS[value],
        }))}
        value={locale}
        onSelect={setLocale}
      />
      {restartNeeded ? (
        <Text size="eyebrow" tone="muted">
          {m.common.restartToApplyLayout}
        </Text>
      ) : null}
    </View>
  );
}

function SettingsBody({ details }: { details: Details }) {
  const m = useMessages();
  const s = m.you.settings;
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [seatAlerts, setSeatAlerts] = useState<boolean | null>(null);
  const [emailNotifications, setEmailNotifications] = useState<boolean | null>(
    null,
  );

  const hasPadel = details.sports.includes("padel");
  const hasFootball = details.sports.includes("football");
  const onboarding = api.users.onboardingState.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const padel = api.users.myProfile.useQuery(
    { sport: "padel" },
    { ...REFETCH_ON_FOREGROUND, enabled: hasPadel },
  );
  const football = api.users.footballProfile.useQuery(
    { userId: details.id },
    { ...REFETCH_ON_FOREGROUND, enabled: hasFootball },
  );
  const teams = api.teams.mine.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const communityInvites = api.communities.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const groupInvites = api.groups.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const teamInvites = api.teams.pendingInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const inviteCount =
    (communityInvites.data?.length ?? 0) +
    (groupInvites.data?.length ?? 0) +
    (teamInvites.data?.length ?? 0);
  const teamCount = teams.data?.length ?? 0;

  const savePlayWindows = api.users.setPlayWindows.useMutation({
    onSuccess: () => utils.users.profileDetails.invalidate(),
    onError: (error) => {
      setSeatAlerts(null);
      toast.show(error.message);
    },
  });

  const saveEmailNotifications = api.users.setEmailNotifications.useMutation({
    onSuccess: () => utils.users.profileDetails.invalidate(),
    onError: (error) => {
      setEmailNotifications(null);
      toast.show(error.message);
    },
  });

  const list = checklistFrom(user, onboarding.data, locale);
  const checklist = list
    ? settingsChecklist(
        list,
        {
          hasDetails: hasDetails(details),
          hasPlayWindows: details.playWindows.length > 0,
        },
        locale,
      )
    : null;

  const name = user?.fullName ?? details.name;
  const phone =
    details.phoneNumber ?? user?.primaryPhoneNumber?.phoneNumber ?? null;
  const email = user?.primaryEmailAddress ?? null;
  const emailVerified = email?.verification.status === "verified";
  const open = (href: string) => router.push(href);

  const padelLevel = padel.data?.level ?? null;
  const footballRating = football.data?.rating ?? null;
  const footballRole = {
    role: isFootballRole(details.preferredFootballRole)
      ? details.preferredFootballRole
      : null,
    position: isFootballPosition(details.preferredFootballPosition)
      ? details.preferredFootballPosition
      : null,
  };

  function confirmDelete() {
    Alert.alert(s.deleteTitle, s.deleteBody, [
      { text: s.cancel, style: "cancel" },
      {
        text: s.deleteConfirm,
        style: "destructive",
        onPress: () => void deleteAccount(),
      },
    ]);
  }

  async function deleteAccount() {
    if (!user || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await user.delete();
      await signOut();
    } catch (error) {
      const split = splitClerkAuthError(error, locale);
      toast.show(split.globalMessage ?? m.common.somethingWentWrong);
      setDeleting(false);
    }
  }

  return (
    <>
      <SettingsGroup>
        <SettingsRow
          leading={
            user?.hasImage ? (
              <Avatar
                name={name}
                uri={user.imageUrl}
                size="lg"
                radius={radii.md}
              />
            ) : (
              <InitialsTile name={name} />
            )
          }
          title={name}
          sub={s.detailsSub}
          onPress={() => open("/profile/details")}
        />
      </SettingsGroup>

      {checklist && !checklist.complete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${s.completeProfile}. ${s.countOf(checklist.done, checklist.total)}. ${checklist.left}`}
          onPress={() => open(checklist.target)}
        >
          <Surface radius="card" style={{ padding: 16, gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}
            >
              <Text weight="semibold">{s.completeProfile}</Text>
              <Text size="eyebrow" tone="muted" mono uppercase>
                {s.countOf(checklist.done, checklist.total)}
              </Text>
            </View>
            <ChecklistSegments
              done={checklist.done}
              total={checklist.total}
              label={m.mobileHome.checklist.progressSpoken(
                checklist.done,
                checklist.total,
              )}
            />
            <Text size="eyebrow" tone="muted">
              {checklist.left}
            </Text>
          </Surface>
        </Pressable>
      ) : null}

      <SettingsGroup label={s.sportProfiles}>
        <SettingsRow
          leading={
            <SportBadge
              label={
                hasPadel
                  ? padelLevel
                    ? displayBand(padelLevel.levelBand)
                    : "–"
                  : null
              }
            />
          }
          title={m.common.padel}
          sub={
            hasPadel
              ? padelSportSub(padelLevel, details.preferredPosition, locale)
              : s.notSetUp
          }
          trailing={hasPadel ? undefined : <SetUpPill label={s.setUp} />}
          chevron={hasPadel}
          onPress={() => router.push(sportProfilePath("padel"))}
        />
        <SettingsRow
          leading={
            <SportBadge
              label={
                hasFootball
                  ? footballRating
                    ? displayBand(footballRating.levelBand)
                    : "–"
                  : null
              }
            />
          }
          title={m.common.football}
          sub={
            hasFootball
              ? footballSportSub(
                  footballRating?.levelBand ?? null,
                  footballRole,
                  locale,
                )
              : s.notSetUp
          }
          trailing={hasFootball ? undefined : <SetUpPill label={s.setUp} />}
          chevron={hasFootball}
          onPress={() => router.push(sportProfilePath("football"))}
        />
      </SettingsGroup>

      <SettingsGroup label={s.account}>
        <SettingsRow
          icon={Smartphone}
          title={s.mobileNumber}
          sub={phone ? displayPhone(phone) : m.common.notSet}
        />
        <SettingsRow
          icon={Mail}
          title={s.email}
          sub={email?.emailAddress ?? s.noEmail}
          trailing={
            email && !emailVerified ? <TagBox label={s.verify} /> : undefined
          }
          accessibilityLabel={[
            s.email,
            email?.emailAddress ?? s.noEmail,
            email ? (emailVerified ? s.verified : s.verify) : null,
          ]
            .filter(Boolean)
            .join(". ")}
          onPress={() => open(profileTaskPath("email"))}
        />
        <SettingsRow
          icon={KeyRound}
          title={s.password}
          sub={s.passwordSub}
          onPress={() => open("/profile/password")}
        />
      </SettingsGroup>

      <SettingsGroup label={s.playing}>
        <SettingsRow
          icon={CalendarClock}
          title={s.whenYouPlay}
          sub={
            playWindowsSummary(details.playWindows, locale) ??
            s.whenYouPlayUnset
          }
          onPress={() => open("/profile/availability")}
        />
        <SwitchRow
          icon={Bell}
          title={s.seatAlerts}
          sub={s.seatAlertsSub}
          value={seatAlerts ?? details.seatAlerts}
          disabled={savePlayWindows.isPending}
          onChange={(next) => {
            setSeatAlerts(next);
            savePlayWindows.mutate({
              playWindows: details.playWindows,
              seatAlerts: next,
            });
          }}
        />
        <SwitchRow
          icon={MailCheck}
          title={s.emailNotifications}
          sub={
            emailVerified
              ? s.emailNotificationsSub
              : s.emailNotificationsNeedEmail
          }
          subAction={
            emailVerified
              ? undefined
              : {
                  label: s.emailNotificationsAddEmail,
                  onPress: () => open(profileTaskPath("email")),
                }
          }
          value={emailNotifications ?? details.emailNotifications}
          disabled={saveEmailNotifications.isPending}
          onChange={(next) => {
            setEmailNotifications(next);
            saveEmailNotifications.mutate({ emailNotifications: next });
          }}
        />
      </SettingsGroup>

      <SettingsGroup label={s.peopleAndBookings}>
        <SettingsRow
          icon={Calendar}
          title={s.bookings}
          sub={s.bookingsSub}
          onPress={() => open("/profile/bookings")}
        />
        <SettingsRow
          icon={Users}
          title={s.teams}
          sub={s.teamsSub}
          accessibilityLabel={m.mobileHome.settings.rowSpokenCount(
            s.teams,
            teamCount,
            s.teamsSub,
          )}
          trailing={
            teamCount > 0 ? (
              <Text size="meta" tone="muted">
                {teamCount}
              </Text>
            ) : undefined
          }
          onPress={() => open("/profile/teams")}
        />
        <SettingsRow
          icon={MailOpen}
          title={s.invites}
          sub={s.invitesSub}
          accessibilityLabel={m.mobileHome.settings.rowSpokenCount(
            s.invites,
            inviteCount,
            s.invitesSub,
          )}
          trailing={
            inviteCount > 0 ? <CountBadge count={inviteCount} /> : undefined
          }
          onPress={() => open("/profile/invites")}
        />
      </SettingsGroup>

      <LanguageGroup />

      <SettingsGroup label={s.about}>
        <SettingsRow
          icon={FileText}
          title={s.terms}
          onPress={() => open("/profile/terms")}
        />
      </SettingsGroup>

      <View style={{ gap: 14 }}>
        <Button
          label={s.signOut}
          variant="outline"
          size="lg"
          pending={signingOut}
          onPress={() => {
            setSigningOut(true);
            signOut().catch(() => setSigningOut(false));
          }}
        />
        <Pressable
          accessibilityRole="button"
          disabled={deleting}
          onPress={confirmDelete}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text
            size="meta"
            style={{ textAlign: "center", color: colors.danger }}
          >
            {deleting ? `${s.deleteAccount}…` : s.deleteAccount}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

export function SettingsScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile"
        title={m.you.settings.title}
      />
      <Block
        slot={slotOf(details)}
        title={m.you.settings.title}
        skeletonHeight={420}
        onRetry={() => void details.refetch()}
      >
        {(data) => <SettingsBody details={data} />}
      </Block>
    </Screen>
  );
}
