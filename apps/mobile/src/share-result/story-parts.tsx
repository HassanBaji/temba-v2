import { bibColors, colors } from "@repo/design-tokens";
import type { FootballBib } from "@repo/domain/football-lineup";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { ResultMark } from "../primitives/result-mark";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text, type TextProps } from "../primitives/text";

/** Type at the card's own scale: these cards are laid out in export pixels. */
export function Big({
  px,
  ratio = 1.1,
  tracking = 0,
  style,
  ...props
}: TextProps & { px: number; ratio?: number; tracking?: number }) {
  return (
    <Text
      {...props}
      style={[
        {
          fontSize: px,
          lineHeight: Math.round(px * ratio),
          letterSpacing: tracking * px,
        },
        style,
      ]}
    />
  );
}

/** A mono label like "WON" or "FRIENDLY · PADEL". */
export function Label({
  px,
  tracking = 0.12,
  ...props
}: TextProps & { px: number; tracking?: number }) {
  return <Big px={px} ratio={1.2} tracking={tracking} mono {...props} />;
}

export function Wordmark({ mark, px }: { mark: number; px: number }) {
  const m = useMessages();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: mark / 3 }}>
      <ResultMark variant="won" size={mark} decorative />
      <Big px={px} ratio={1.2} tracking={0.18}>
        {m.common.appName.toUpperCase()}
      </Big>
    </View>
  );
}

/** A bib colour square; a black bib gets a grey edge so it shows on ink. */
export function BibSquare({
  bib,
  size,
  radius,
}: {
  bib: FootballBib;
  size: number;
  radius: number;
}) {
  const { fill } = bibColors[bib];
  const edge =
    fill === colors.ink
      ? colors.muted
      : fill === colors.paper
        ? colors.rule
        : fill;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: fill,
        borderWidth: 2,
        borderColor: edge,
      }}
    />
  );
}

/** A square initials tile: solid paper, or an outline in a given ink. */
export function InitialsSquare({
  init,
  size,
  radius,
  px,
  variant,
}: {
  init: string;
  size: number;
  radius: number;
  px: number;
  variant: "solid" | "outline" | "outline-muted";
}) {
  const solid = variant === "solid";
  const edge = variant === "outline-muted" ? colors.muted : colors.paper;
  const ink =
    variant === "solid"
      ? colors.ink
      : variant === "outline-muted"
        ? colors.dim
        : colors.paper;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: solid ? colors.paper : "transparent",
        borderWidth: solid ? 0 : 2,
        borderColor: edge,
      }}
    >
      <Big px={px} weight="semibold" style={{ color: ink }}>
        {init}
      </Big>
    </View>
  );
}

/** Everything inside reads as on ink, without claiming the screen's focus. */
export function InkCanvas({
  style,
  children,
}: {
  style: React.ComponentProps<typeof View>["style"];
  children: React.ReactNode;
}) {
  return (
    <SurfaceToneContext.Provider value="ink">
      <View style={style}>{children}</View>
    </SurfaceToneContext.Provider>
  );
}
