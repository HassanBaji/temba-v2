import { colors } from "@repo/design-tokens";
import { type VenueBannerImage } from "@repo/domain/venue-photos";
import { useState } from "react";
import { View } from "react-native";

import { apiOrigin } from "../lib/api-origin-runtime";
import { mediaUrl } from "../lib/media-url";
import { CachedImage } from "../primitives/cached-image";
import { Hatch } from "../primitives/hatch";

const LOGO_RATIO = 0.6;

/** A Venue photo edge to edge, the logo on a wash, or hatch while the Venue has neither. */
export function VenueBanner({
  image,
  height,
  children,
}: {
  image: VenueBannerImage;
  height: number;
  children?: React.ReactNode;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = image.kind === "none" ? null : mediaUrl(image.url, apiOrigin);
  const shown = uri !== null && uri !== failedUri ? uri : null;

  return (
    <View
      style={{
        height,
        backgroundColor: colors.wash,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {shown && image.kind === "photo" ? (
        <CachedImage
          accessibilityIgnoresInvertColors
          uri={shown}
          contentFit="cover"
          onError={() => setFailedUri(shown)}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
      ) : shown ? (
        <CachedImage
          accessibilityIgnoresInvertColors
          uri={shown}
          contentFit="contain"
          onError={() => setFailedUri(shown)}
          style={{ width: "60%", height: height * LOGO_RATIO }}
        />
      ) : (
        <Hatch radius={0} bordered={false} />
      )}
      {children}
    </View>
  );
}
