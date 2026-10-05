import { colors, sizes, spacing } from "@repo/design-tokens";
import {
  PREFERRED_POSITION_CHOICES,
  preferredPositionNote,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
import { ChevronRight, Mail, Users } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { Block } from "../home/slot-block";
import { ChoiceRow } from "../lib/choice-row";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Section } from "../primitives/section";
import { Text } from "../primitives/text";
import type { PositionSetting } from "./profile-model";
import type { Slot } from "../home/home-model";

export type ProfileDestination = "teams" | "invites";

function LinkRow({
  icon,
  title,
  subtitle,
  count,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `${title}, ${count}. ${subtitle}` : `${title}. ${subtitle}`
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
      <ChevronRight size={sizes.iconAction} color={colors.muted} />
    </Pressable>
  );
}

export function ProfileSettings({
  position,
  selectedPosition,
  savingPosition,
  teamCount,
  pendingInviteCount,
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
  signingOut: boolean;
  onSelectPosition: (value: PreferredPosition) => void;
  onOpen: (destination: ProfileDestination) => void;
  onSignOut: () => void;
  onRetry: () => void;
}) {
  return (
    <Section title="Settings">
      <Block
        slot={position}
        title="Preferred Position"
        skeletonHeight={132}
        onRetry={onRetry}
      >
        {(setting) => (
          <Card title="Preferred Position">
            <View
              style={{
                paddingHorizontal: spacing.surface,
                paddingBottom: spacing.surface,
                gap: 10,
              }}
            >
              <Text size="meta" tone="muted">
                Your default side when you pick a Game seat
              </Text>
              <ChoiceRow
                label="Preferred Position"
                choices={PREFERRED_POSITION_CHOICES}
                value={selectedPosition ?? ""}
                onSelect={onSelectPosition}
                disabled={!setting.editable || savingPosition}
              />
              <Text size="meta" tone="muted">
                {preferredPositionNote(selectedPosition)}
              </Text>
            </View>
          </Card>
        )}
      </Block>
      <Card>
        <LinkRow
          icon={<Users size={sizes.iconAction} color={colors.ink} />}
          title="Teams"
          subtitle="Partnerships you play as"
          count={teamCount}
          onPress={() => onOpen("teams")}
        />
        <Hairline />
        <LinkRow
          icon={<Mail size={sizes.iconAction} color={colors.ink} />}
          title="Invites"
          subtitle="Lookup invites addressed to you"
          count={pendingInviteCount}
          onPress={() => onOpen("invites")}
        />
      </Card>
      <View style={{ flexDirection: "row" }}>
        <Button
          label="Sign out"
          variant="outline"
          pending={signingOut}
          onPress={onSignOut}
        />
      </View>
    </Section>
  );
}
