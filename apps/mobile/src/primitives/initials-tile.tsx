import { radii } from "@repo/design-tokens";
import { useState } from "react";
import { View } from "react-native";

import { useColors } from "../theme/theme-provider";
import { CachedImage } from "./cached-image";
import { initialsFor } from "./initials";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";

const SIZES = {
  "2xs": 20,
  xs: 28,
  md: 34,
  default: 40,
  xl: 44,
  lg: 56,
} as const;

type TileSize = keyof typeof SIZES;

const RADII: Record<TileSize, number> = {
  "2xs": radii.slot,
  xs: radii.sm,
  md: radii.md,
  default: radii.md,
  xl: radii.lg,
  lg: radii.md,
};

const TEXT_SIZES = {
  "2xs": "eyebrow",
  xs: "eyebrow",
  md: "eyebrow",
  default: "meta",
  xl: "body",
  lg: "title",
} as const;

/**
 * A solid square with the User's initials: the design's "initials tile".
 * `inverse` is the paper tile that sits on an ink card; `ink` is drawn in the
 * text colour, light on dark. With `uri`, the image fills the tile, back to
 * the initials if it fails to load.
 */
export function InitialsTile({
  name,
  uri,
  size = "default",
  tone = "control",
}: {
  name: string;
  uri?: string | null;
  size?: TileSize;
  tone?: "control" | "inverse" | "ink";
}) {
  const dimension = SIZES[size];
  const colors = useColors();
  const fill = {
    control: { background: colors.control, text: colors.onControl },
    inverse: { background: colors.focusControl, text: colors.onFocusControl },
    ink: { background: colors.ink, text: colors.paper },
  }[tone];
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = uri != null && uri.length > 0 && failed !== uri;
  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={name}
        style={{
          width: dimension,
          height: dimension,
          borderRadius: RADII[size],
          backgroundColor: fill.background,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {showImage ? (
          <CachedImage
            uri={uri}
            style={{ width: dimension, height: dimension }}
            contentFit="cover"
            onError={() => setFailed(uri)}
          />
        ) : (
          <Text
            size={TEXT_SIZES[size]}
            weight="semibold"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: fill.text }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {initialsFor(name)}
          </Text>
        )}
      </View>
    </SurfaceToneContext.Provider>
  );
}
