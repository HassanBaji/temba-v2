import { radii, sizes } from "@repo/design-tokens";
import type { ChallengeProposalView } from "@repo/domain/challenge-card";
import type { ChallengeProposalCardView } from "@repo/domain/challenge-detail";
import { ActivityIndicator, Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Hairline } from "../primitives/hairline";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/** A Proposal's time, place, price and clock, as one block of lines. */
export function ProposalLines({
  view,
  lead,
}: {
  view: ChallengeProposalView;
  /** The line above the terms, such as "Waiting on Seef Smashers to confirm". */
  lead?: string | null;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text size="lead" weight="semibold">
        {view.title}
      </Text>
      {lead ? <Text size="meta">{lead}</Text> : null}
      <Text>{view.whenLine}</Text>
      <Text size="meta" tone="muted">
        {view.whereLine}
      </Text>
      {view.priceLine ? (
        <Text size="meta" tone="muted">
          {view.priceLine}
        </Text>
      ) : null}
      <Text size="meta" tone="muted">
        {view.expiresLine}
      </Text>
    </View>
  );
}

export type ProposalCardAction = {
  label: string;
  accessibilityLabel?: string;
  pending?: boolean;
  onPress: () => void;
};

function SplitButton({
  action,
  primary,
}: {
  action: ProposalCardAction;
  primary: boolean;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityState={{ busy: action.pending, disabled: action.pending }}
      disabled={action.pending}
      onPress={action.onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: sizes.touchTarget,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? palette.wash : undefined,
      })}
    >
      {action.pending ? (
        <ActivityIndicator color={palette.muted} />
      ) : (
        <Text
          size="meta"
          weight={primary ? "semibold" : "regular"}
          tone={primary ? "default" : "muted"}
        >
          {action.label}
        </Text>
      )}
    </Pressable>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
      <Text weight="semibold">{value}</Text>
    </View>
  );
}

/**
 * One pending Proposal: a marker, who and the clock, Time and Venue side by
 * side, then two actions split by a hairline. `focus` draws the ink edge.
 */
export function ProposalCard({
  view,
  marker,
  focus,
  primary,
  secondary,
}: {
  view: ChallengeProposalCardView;
  marker: React.ReactNode;
  focus: boolean;
  primary: ProposalCardAction;
  secondary: ProposalCardAction;
}) {
  const palette = useTonePalette();
  const colors = useColors();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: focus ? colors.ink : palette.rule,
        borderRadius: radii.card,
        overflow: "hidden",
        backgroundColor: palette.background,
      }}
    >
      <View accessible accessibilityLabel={view.accessibilityLabel}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 14,
            paddingHorizontal: 18,
          }}
        >
          {marker}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold">{view.title}</Text>
            <Text size="eyebrow" tone="muted">
              {view.subline}
            </Text>
          </View>
        </View>
        <Hairline />
        <View style={{ paddingVertical: 12, paddingHorizontal: 18, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Term label={view.timeLabel} value={view.timeValue} />
            <Term label={view.venueLabel} value={view.venueValue} />
          </View>
          {view.priceValue ? (
            <Term label={view.priceLabel} value={view.priceValue} />
          ) : null}
        </View>
      </View>
      <Hairline />
      <View style={{ flexDirection: "row" }}>
        <SplitButton action={primary} primary />
        <View style={{ width: hairline, backgroundColor: palette.rule }} />
        <SplitButton action={secondary} primary={false} />
      </View>
    </View>
  );
}
