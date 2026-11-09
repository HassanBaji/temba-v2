import { radii, sizes } from "@repo/design-tokens";
import type { TeamRosterDraftView } from "@repo/domain/team-roster-draft";
import { ArrowLeft, type LucideProps } from "lucide-react-native";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useLeaveScreen } from "../primitives/screen-header";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { TEAMS_PATH } from "./teams-model";

const SEAT_HEIGHT = 8;
const SEAT_RADIUS = 2;

function BackArrow(props: LucideProps) {
  return <ArrowLeft {...props} style={mirrorInRtl} />;
}

/** Back arrow and the title on one line; back leaves unless `onBack` says otherwise. */
export function CreateTeamHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const leave = useLeaveScreen(TEAMS_PATH);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.common.back}
        onPress={onBack ?? leave}
        style={({ pressed }) => ({
          width: sizes.touchTarget,
          height: sizes.touchTarget,
          marginStart: -12,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <BackArrow size={sizes.iconAction} color={colors.ink} />
      </Pressable>
      <Text
        size="h2"
        weight="bold"
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {title}
      </Text>
    </View>
  );
}

/** Expanded section heading with a muted note at its end. */
export function CreateTeamSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Text
          size="title"
          weight="bold"
          width="expanded"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {aside ? (
          <Text
            size="eyebrow"
            tone="muted"
            numberOfLines={1}
            accessibilityLiveRegion="polite"
            style={{ flexShrink: 1 }}
          >
            {aside}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A hairline card with rows divided by hairlines, the design's list frame. */
export function CreateTeamCard({
  emphasis = false,
  children,
  style,
}: {
  emphasis?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          borderWidth: hairline,
          borderColor: emphasis ? colors.ink : colors.rule,
          borderRadius: radii.card,
          backgroundColor: colors.paper,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type CreateTeamTileTone = "in" | "plain" | "invited" | "added";

const TILE = { sm: { size: 34, radius: 9 }, md: { size: 40, radius: 11 } };

/**
 * A player's initials tile: solid when in, outlined when only listed,
 * hatched while an invite waits, hatched and dashed for a number added
 * without Temba.
 */
export function CreateTeamTile({
  tone,
  size = "sm",
  initials,
  children,
}: {
  tone: CreateTeamTileTone;
  size?: keyof typeof TILE;
  initials?: string;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const { size: dimension, radius } = TILE[size];
  const hatched = tone === "invited" || tone === "added";
  return (
    <SurfaceToneContext.Provider value={tone === "in" ? "ink" : "paper"}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: dimension,
          height: dimension,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: tone === "in" ? colors.control : colors.paper,
          borderWidth: tone === "added" ? 1 : hairline,
          borderStyle: tone === "added" ? "dashed" : "solid",
          borderColor:
            tone === "in"
              ? colors.controlEdge
              : tone === "added"
                ? colors.inputBorder
                : colors.rule,
        }}
      >
        {hatched ? <Hatch radius={radius} bordered={false} /> : null}
        {initials ? (
          <View
            style={
              hatched
                ? {
                    backgroundColor: colors.paper,
                    paddingHorizontal: 3,
                    borderRadius: 3,
                  }
                : undefined
            }
          >
            <Text
              size="eyebrow"
              weight="semibold"
              style={tone === "in" ? { color: colors.onControl } : undefined}
            >
              {initials}
            </Text>
          </View>
        ) : (
          children
        )}
      </View>
    </SurfaceToneContext.Provider>
  );
}

function Seat({ state }: { state: "in" | "pending" | "open" }) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        height: SEAT_HEIGHT,
        borderRadius: SEAT_RADIUS,
        overflow: "hidden",
        backgroundColor: state === "in" ? colors.control : undefined,
        borderWidth: state === "open" ? hairline : 0,
        borderColor: colors.rule,
      }}
    >
      {state === "pending" ? (
        <Hatch
          radius={SEAT_RADIUS}
          style={{ borderColor: colors.inputBorder }}
        />
      ) : null}
    </View>
  );
}

function LegendSwatch({ state }: { state: "in" | "pending" }) {
  return (
    <View style={{ width: 14, flexDirection: "row" }}>
      <Seat state={state} />
    </View>
  );
}

/** One segment per Roster seat: in, waiting, open. */
export function CreateTeamSeatStrip({
  roster,
  legend,
}: {
  roster: TeamRosterDraftView;
  legend: boolean;
}) {
  const m = useMessages().team.create;
  return (
    <View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={roster.stripSpoken}
        style={{ flexDirection: "row", gap: 2 }}
      >
        {roster.seats.map((seat, index) => (
          <Seat key={index} state={seat} />
        ))}
      </View>
      <View
        style={{
          marginTop: 6,
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="eyebrow" tone="muted" style={{ flexShrink: 1 }}>
          {roster.stripHelper ?? ""}
        </Text>
        <Text size="eyebrow" tone="muted">
          {roster.stripMax}
        </Text>
      </View>
      {legend ? (
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            flexWrap: "wrap",
            columnGap: 14,
            rowGap: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <LegendSwatch state="in" />
            <Text size="eyebrow" tone="muted">
              {m.legendIn}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <LegendSwatch state="pending" />
            <Text size="eyebrow" tone="muted">
              {m.legendPending}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The design's black pill action inside a card: Invite, Add. */
export function CreateTeamPillButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <SurfaceToneContext.Provider value="ink">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={4}
        style={({ pressed }) => ({
          height: 36,
          paddingHorizontal: 14,
          borderRadius: radii.md,
          backgroundColor: colors.control,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        })}
      >
        <Text size="meta" weight="semibold" style={{ color: colors.onControl }}>
          {label}
        </Text>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}
