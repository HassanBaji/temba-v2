import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  gameInviteGroupCard,
  gameInviteGroupSheetCopy,
  type GameInviteGroup,
  type GameInviteGroupChoice,
} from "@repo/domain/invites";
import {
  CalendarPlus,
  Info,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const OPTION_ICONS: Record<GameInviteGroupChoice, LucideIcon> = {
  with_seat: CalendarPlus,
  group_only: Users,
};
const STACK_OVERLAP = -8;

export type GroupJoinSheetProps = {
  visible: boolean;
  group: GameInviteGroup;
  pending: GameInviteGroupChoice | null;
  onChoose: (choice: GameInviteGroupChoice) => void;
  onClose: () => void;
};

function IconBox({ Icon }: { Icon: LucideIcon }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: sizes.touchTarget,
        height: sizes.touchTarget,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.sm,
        borderWidth: hairline,
        borderColor: palette.rule,
        backgroundColor: palette.wash,
      }}
    >
      <Icon size={sizes.iconAction} color={palette.foreground} />
    </View>
  );
}

function GroupCard({ group }: { group: GameInviteGroup }) {
  const locale = useLocale();
  const card = gameInviteGroupCard(group, locale);
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: spacing.surface,
        }}
      >
        <Avatar
          name={card.name}
          uri={group.imageUrl}
          size="court"
          radius={radii.md}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {card.sport ? (
            <Text size="eyebrow" tone="muted">
              {card.sport}
            </Text>
          ) : null}
          <Text size="lead" weight="semibold" numberOfLines={1}>
            {card.name}
          </Text>
          <Text size="meta" tone="muted">
            {card.meta}
          </Text>
        </View>
      </View>
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: spacing.surface,
          paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: "row" }}>
          {group.memberNames.slice(0, 3).map((name, index) => (
            <View
              key={`${name}-${index}`}
              style={{ marginStart: index === 0 ? 0 : STACK_OVERLAP }}
            >
              <Avatar name={name} size="sm" />
            </View>
          ))}
        </View>
        <Text size="meta" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {card.memberLine}
        </Text>
      </View>
    </Surface>
  );
}

function OptionCard({
  choice,
  title,
  description,
  tone,
  pending,
  disabled,
  onPress,
}: {
  choice: GameInviteGroupChoice;
  title: string;
  description: string;
  tone: "ink" | "paper";
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = OPTION_ICONS[choice];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${description}`}
      accessibilityState={{ disabled, busy: pending }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed || disabled ? 0.7 : 1 })}
    >
      <Surface
        tone={tone}
        radius="card"
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <IconBox Icon={Icon} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text size="lead" weight="semibold">
            {title}
          </Text>
          <Text size="meta" tone="muted">
            {description}
          </Text>
        </View>
        {pending ? <OptionSpinner /> : null}
      </Surface>
    </Pressable>
  );
}

function OptionSpinner() {
  const palette = useTonePalette();
  return <ActivityIndicator color={palette.foreground} />;
}

/** The Group question a non-member answers before taking a seat (design "Join via link" 1b, 1c). */
export function GroupJoinSheet({
  visible,
  group,
  pending,
  onChoose,
  onClose,
}: GroupJoinSheetProps) {
  const locale = useLocale();
  const colors = useColors();
  const copy = gameInviteGroupSheetCopy(group, locale);
  const busy = pending != null;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.lead}
      closeButton
    >
      <GroupCard group={group} />
      <View style={{ gap: 10, paddingTop: 6 }}>
        {copy.options.map((option, index) => (
          <OptionCard
            key={option.choice}
            choice={option.choice}
            title={option.title}
            description={option.description}
            tone={index === 0 ? "ink" : "paper"}
            pending={pending === option.choice}
            disabled={busy}
            onPress={() => onChoose(option.choice)}
          />
        ))}
      </View>
      {copy.dismissLabel ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          hitSlop={8}
          style={{
            minHeight: sizes.touchTarget,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text tone="muted">{copy.dismissLabel}</Text>
        </Pressable>
      ) : null}
      {copy.note ? (
        <Surface
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
        >
          <Info
            size={sizes.iconRow}
            color={colors.muted}
            style={{ marginTop: 2 }}
          />
          <Text size="meta" tone="muted" style={{ flex: 1 }}>
            {copy.note}
          </Text>
        </Surface>
      ) : null}
    </Sheet>
  );
}
