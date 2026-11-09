import { View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text, type TextProps } from "../primitives/text";

const TILE = {
  crest: { side: 64, radius: 17 },
  seat: { side: 40, radius: 11 },
  rival: { side: 40, radius: 11 },
  member: { side: 34, radius: 9 },
  mini: { side: 32, radius: 9 },
} as const;

const LABEL: Record<
  keyof typeof TILE,
  Pick<TextProps, "size" | "weight" | "width">
> = {
  crest: { size: "figure", weight: "bold", width: "expanded" },
  seat: { size: "meta", weight: "semibold" },
  rival: { size: "meta", weight: "bold", width: "expanded" },
  member: { size: "eyebrow", weight: "semibold" },
  mini: { size: "eyebrow", weight: "bold", width: "expanded" },
};

export type TeamTileTone = "solid" | "outline" | "hatched" | "empty";

/**
 * A square initials tile: the Team crest, a member's seat or a Rival. Solid
 * takes the control colour of the surface it sits on (white on the ink hero,
 * black on paper); outline is a teammate; hatched is a seat not filled yet.
 */
export function TeamTile({
  initials,
  tone,
  size,
  children,
}: {
  initials?: string;
  tone: TeamTileTone;
  size: keyof typeof TILE;
  children?: React.ReactNode;
}) {
  const palette = useTonePalette();
  const { side, radius } = TILE[size];
  const solid = tone === "solid";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: side,
        height: side,
        borderRadius: radius,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: solid ? palette.control : palette.background,
        borderWidth: tone === "outline" || tone === "empty" ? hairline : 0,
        borderColor: palette.rule,
        borderStyle: tone === "empty" ? "dashed" : "solid",
      }}
    >
      {tone === "hatched" ? <Hatch radius={radius} /> : null}
      {children ??
        (initials ? (
          <Text
            {...LABEL[size]}
            style={solid ? { color: palette.onControl } : undefined}
          >
            {initials}
          </Text>
        ) : null)}
    </View>
  );
}
