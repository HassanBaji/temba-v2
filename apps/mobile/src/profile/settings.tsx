import { colors, sizes, spacing } from "@repo/design-tokens";
import {
  preferredPositionChoices,
  preferredPositionNote,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
import { LOCALES, LOCALE_LABELS } from "@repo/i18n/locale";
import {
  Calendar,
  ChevronRight,
  CircleUserRound,
  FileText,
  Mail,
  Users,
} from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { Block } from "../home/slot-block";
import {
  useLocale,
  useLocaleSwitch,
  useMessages,
} from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { ChoiceRow } from "../lib/choice-row";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Section } from "../primitives/section";
import { Text } from "../primitives/text";
import type { PositionSetting, ProfileDestination } from "./profile-model";
import type { Slot } from "../home/home-model";

export type { ProfileDestination } from "./profile-model";

function LinkRow({
  icon,
  title,
  subtitle,
  count = 0,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count?: number;
  onPress: () => void;
}) {
  const m = useMessages();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count > 0
          ? m.mobileHome.settings.rowSpokenCount(title, count, subtitle)
          : m.mobileHome.settings.rowSpoken(title, subtitle)
      }
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: spacing.surface,
        paddingVertical: 14,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="lead" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {count > 0 ? (
        <Text size="meta" tone="muted">
          {count}
        </Text>
      ) : null}
      <ChevronRight
        size={sizes.iconAction}
        color={colors.muted}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}

function LanguageCard() {
  const m = useMessages();
  const { locale, setLocale, restartNeeded } = useLocaleSwitch();
  return (
    <Card title={m.common.language}>
      <View
        style={{
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
          gap: 10,
        }}
      >
        <ChoiceRow
          label={m.common.language}
          choices={LOCALES.map((value) => ({
            value,
            label: LOCALE_LABELS[value],
          }))}
          value={locale}
          onSelect={setLocale}
          disabled={false}
        />
        {restartNeeded ? (
          <Text size="meta" tone="muted">
            {m.common.restartToApplyLayout}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export function ProfileSettings({
  position,
  selectedPosition,
  savingPosition,
  teamCount,
  pendingInviteCount,
  checklistIncomplete,
  signingOut,
  onSelectPosition,
  onOpen,
  onSignOut,
  onRetry,
}: {
  position: Slot<PositionSetting>;
  selectedPosition: PreferredPosition | null;
  savingPosition: boolean;
  teamCount: number;
  pendingInviteCount: number;
  checklistIncomplete: boolean;
  signingOut: boolean;
  onSelectPosition: (value: PreferredPosition) => void;
  onOpen: (destination: ProfileDestination) => void;
  onSignOut: () => void;
  onRetry: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <Section title={m.common.settings}>
      <Block
        slot={position}
        title={m.mobileHome.settings.preferredPosition}
        skeletonHeight={132}
        onRetry={onRetry}
      >
        {(setting) => (
          <Card title={m.mobileHome.settings.preferredPosition}>
            <View
              style={{
                paddingHorizontal: spacing.surface,
                paddingBottom: spacing.surface,
                gap: 10,
              }}
            >
              <Text size="meta" tone="muted">
                {m.mobileHome.settings.preferredPositionHint}
              </Text>
              <ChoiceRow
                label={m.mobileHome.settings.preferredPosition}
                choices={preferredPositionChoices(locale)}
                value={selectedPosition ?? ""}
                onSelect={onSelectPosition}
                disabled={!setting.editable || savingPosition}
              />
              <Text size="meta" tone="muted">
                {preferredPositionNote(selectedPosition, locale)}
              </Text>
            </View>
          </Card>
        )}
      </Block>
      <LanguageCard />
      <Card>
        {checklistIncomplete ? (
          <>
            <LinkRow
              icon={
                <CircleUserRound size={sizes.iconAction} color={colors.ink} />
              }
              title={m.mobileHome.checklist.title}
              subtitle={m.mobileHome.settings.completeProfileHint}
              onPress={() => onOpen("complete-profile")}
            />
            <Hairline />
          </>
        ) : null}
        <LinkRow
          icon={<Calendar size={sizes.iconAction} color={colors.ink} />}
          title={m.mobileHome.settings.myBookings}
          subtitle={m.mobileHome.settings.myBookingsHint}
          onPress={() => onOpen("bookings")}
        />
        <Hairline />
        <LinkRow
          icon={<Users size={sizes.iconAction} color={colors.ink} />}
          title={m.common.teams}
          subtitle={m.team.description}
          count={teamCount}
          onPress={() => onOpen("teams")}
        />
        <Hairline />
        <LinkRow
          icon={<Mail size={sizes.iconAction} color={colors.ink} />}
          title={m.common.invites}
          subtitle={m.mobileHome.settings.invitesHint}
          count={pendingInviteCount}
          onPress={() => onOpen("invites")}
        />
        <Hairline />
        <LinkRow
          icon={<FileText size={sizes.iconAction} color={colors.ink} />}
          title={m.mobileHome.terms.title}
          subtitle={m.mobileHome.settings.termsHint}
          onPress={() => onOpen("terms")}
        />
      </Card>
      <View style={{ flexDirection: "row" }}>
        <Button
          label={m.common.signOut}
          variant="outline"
          pending={signingOut}
          onPress={onSignOut}
        />
      </View>
    </Section>
  );
}
