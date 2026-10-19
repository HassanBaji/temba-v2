import { colors } from "@repo/design-tokens";
import { useState } from "react";
import { Image, View } from "react-native";

import { apiOrigin } from "../lib/api-origin-runtime";
import { mediaUrl } from "../lib/media-url";
import { Hatch } from "../primitives/hatch";

const LOGO_RATIO = 0.6;

/** The Venue's logo on a wash, or hatch while the Venue has none. */
export function VenueBanner({
  logoImageUrl,
  height,
  children,
}: {
  logoImageUrl: string | null;
  height: number;
  children?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const uri = mediaUrl(logoImageUrl, apiOrigin);
  const showLogo = uri !== null && !failed;

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
      {showLogo ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={{ width: "60%", height: height * LOGO_RATIO }}
        />
      ) : (
        <Hatch radius={0} bordered={false} />
      )}
      {children}
    </View>
  );
}
