import { radii, spacing } from "@repo/design-tokens";
import type { RatingsLevelFooter } from "@repo/domain/ratings-screen";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

import { mirrorInRtl } from "../i18n/rtl";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { Sparkline } from "./sparkline";

const BAR_HEIGHT = 10;
const PIP_WIDTH = 14;
const PIP_HEIGHT = 8;
const PIP_RADIUS = 2;
const CHEVRON = 15;
const SPARK_WIDTH = 70;
const SPARK_HEIGHT = 24;
const START_WIDTH = 104;

export type FootballLevelFaceProps = {
  numberLabel: string;
  number: string;
  scale: { percent: number; ticks: readonly string[] };
  change: {
    amount: string;
    caption: string;
    points: readonly number[];
  } | null;
  start: string | null;
  footer: RatingsLevelFooter;
  /** The card opens somewhere, so the footer ends in a chevron. */
  opens?: boolean;
};

/**
 * The football Level card body: no band, only the OVR, the 40 to 99 scale
 * under it, the recent change top right, and the way to confirming or the
 * last Match in the footer. Its colours follow the Surface it sits on.
 */
export function FootballLevelFace({
  numberLabel,
  number,
  scale,
  change,
  start,
  footer,
  opens = false,
}: FootballLevelFaceProps) {
  const palette = useTonePalette();
  return (
    <>
      <View
        style={{
          paddingHorizontal: spacing.surface,
          paddingTop: 18,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flexShrink: 1, gap: 6 }}>
            <Text size="meta" tone="muted">
              {numberLabel}
            </Text>
            <Text size="levelNumber" width="expanded" weight="bold">
              {number}
            </Text>
          </View>
          {change ? (
            <View style={{ alignItems: "flex-end", gap: 4, paddingBottom: 6 }}>
              <Sparkline
                values={change.points}
                width={SPARK_WIDTH}
                height={SPARK_HEIGHT}
              />
              <View
                style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}
              >
                <Text size="lead" width="expanded" weight="bold" ltr>
                  {change.amount}
                </Text>
                <Text size="eyebrow" tone="muted">
                  {change.caption}
                </Text>
              </View>
            </View>
          ) : start ? (
            <Text
              size="eyebrow"
              tone="muted"
              style={{
                maxWidth: START_WIDTH,
                textAlign: "right",
                paddingBottom: 6,
              }}
            >
              {start}
            </Text>
          ) : null}
        </View>
        <View style={{ marginTop: 18, gap: 6 }}>
          <View
            style={{
              height: BAR_HEIGHT,
              borderRadius: radii.slot,
              overflow: "hidden",
            }}
          >
            <Hatch radius={radii.slot} />
            <View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                start: 0,
                width: `${scale.percent}%`,
                borderRadius: radii.slot,
                backgroundColor: palette.foreground,
              }}
            />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {scale.ticks.map((tick) => (
              <Text key={tick} size="eyebrow" tone="muted">
                {tick}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: spacing.surface,
          paddingVertical: 13,
        }}
      >
        <Text size="meta" tone="muted" style={{ flexShrink: 0 }}>
          {footer.label}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {footer.pips ? <Pips {...footer.pips} /> : null}
          {footer.result ? (
            <Text
              size="meta"
              tone="muted"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {footer.result}
            </Text>
          ) : null}
          {footer.value ? (
            footer.pips ? (
              <Text size="meta" weight="semibold">
                {footer.value}
              </Text>
            ) : (
              <Text width="expanded" weight="bold" ltr>
                {footer.value}
              </Text>
            )
          ) : null}
          {opens ? (
            <ChevronRight
              size={CHEVRON}
              color={palette.muted}
              style={mirrorInRtl}
            />
          ) : null}
        </View>
      </View>
    </>
  );
}

function Pips({ done, total }: { done: number; total: number }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 3 }}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            width: PIP_WIDTH,
            height: PIP_HEIGHT,
            borderRadius: PIP_RADIUS,
            overflow: "hidden",
            backgroundColor: index < done ? palette.foreground : undefined,
          }}
        >
          {index < done ? null : <Hatch radius={PIP_RADIUS} />}
        </View>
      ))}
    </View>
  );
}
