import { radii, spacing } from "@repo/design-tokens";
import { useContext, useEffect } from "react";
import { View, type ViewProps } from "react-native";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { useColors } from "../theme/theme-provider";
import { hairline } from "./hairline-width";
import { InkRegistryContext, SurfaceToneContext } from "./surface-context";
import { tonePalette } from "./tone-palette";

export type SurfaceProps = ViewProps & {
  tone?: SurfaceTone;
  padded?: boolean;
  radius?: keyof typeof radii;
};

export function Surface({
  tone = "paper",
  padded = true,
  radius = "surface",
  style,
  ...props
}: SurfaceProps) {
  const colors = useColors();
  const palette = tonePalette(tone, colors);
  const inkRegistry = useContext(InkRegistryContext);

  useEffect(() => {
    if (tone !== "ink" || !inkRegistry) {
      return undefined;
    }
    return inkRegistry.register();
  }, [tone, inkRegistry]);

  return (
    <SurfaceToneContext.Provider value={tone}>
      <View
        {...props}
        style={[
          {
            backgroundColor: palette.background,
            borderRadius: radii[radius],
            padding: padded ? spacing.surface : 0,
            borderWidth: hairline,
            borderColor: tone === "ink" ? colors.focusEdge : palette.rule,
          },
          style,
        ]}
      />
    </SurfaceToneContext.Provider>
  );
}
