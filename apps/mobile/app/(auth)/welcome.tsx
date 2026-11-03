import { colors, radii, spacing } from "@repo/design-tokens";
import { router } from "expo-router";
import { Phone } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageSwitch } from "../../src/auth/language-switch";
import { OauthButtons } from "../../src/auth/oauth-buttons";
import { TermsMicrocopy } from "../../src/auth/terms-microcopy";
import { useMessages } from "../../src/i18n/locale-provider";
import { Button } from "../../src/primitives/button";
import { hairline } from "../../src/primitives/hairline-width";
import { Hatch } from "../../src/primitives/hatch";
import { ResultMark } from "../../src/primitives/result-mark";
import { SurfaceToneContext } from "../../src/primitives/surface-context";
import { Text } from "../../src/primitives/text";

const TILE = 36;
const PHONE_ICON = 18;
/** Fixed decorative content: a Game tonight with one seat open. */
const TONIGHT_PLAYERS = ["MK", "AH", "SR"];

function PlayerTile({ initials }: { initials: string }) {
  return (
    <View
      style={{
        width: TILE,
        height: TILE,
        borderRadius: radii.sm,
        borderWidth: hairline,
        borderColor: colors.dimrule,
        backgroundColor: colors.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text size="eyebrow" weight="semibold">
        {initials}
      </Text>
    </View>
  );
}

function TonightStrip() {
  const m = useMessages();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        gap: 12,
        padding: 14,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.dimrule,
      }}
    >
      <Text size="eyebrow" tone="muted" mono uppercase>
        {m.mobileHome.welcome.tonightLabel}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {TONIGHT_PLAYERS.map((initials) => (
          <PlayerTile key={initials} initials={initials} />
        ))}
        <View
          style={{
            height: TILE,
            paddingHorizontal: 12,
            borderRadius: radii.sm,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Hatch radius={radii.sm} />
          <Text size="eyebrow" weight="medium">
            {m.mobileHome.welcome.oneOpen}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function Welcome() {
  const m = useMessages();
  const insets = useSafeAreaInsets();

  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.ink,
          paddingTop: insets.top + spacing.section,
          paddingBottom: insets.bottom + spacing.section,
          paddingHorizontal: spacing.section,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 11,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
            <ResultMark variant="won" size={26} decorative />
            <Text size="title" width="expanded" weight="bold" uppercase>
              {m.common.appName}
            </Text>
          </View>
          <LanguageSwitch />
        </View>
        <View style={{ marginTop: 72, gap: 20 }}>
          <Text
            size="hero"
            width="expanded"
            weight="bold"
            accessibilityRole="header"
          >
            {m.mobileHome.welcome.headline}
          </Text>
          <Text tone="muted" style={{ maxWidth: 300 }}>
            {m.mobileHome.welcome.body}
          </Text>
        </View>
        <View style={{ marginTop: 32 }}>
          <TonightStrip />
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <Button
            label={m.mobileHome.welcome.continueWithPhone}
            size="lg"
            icon={<Phone size={PHONE_ICON} color={colors.ink} />}
            onPress={() => router.push("/sign-in")}
          />
          <OauthButtons variant="outline-inverse" divider={false} />
          <View style={{ marginTop: 8 }}>
            <TermsMicrocopy />
          </View>
        </View>
      </View>
    </SurfaceToneContext.Provider>
  );
}
