import { colors, radii, spacing } from "@repo/design-tokens";
import { SPORTS, SPORT_LABELS } from "@repo/domain/sport";
import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SportGlyph } from "../../src/lib/sport-glyph";
import { Button } from "../../src/primitives/button";
import { hairline } from "../../src/primitives/hairline-width";
import { ResultMark } from "../../src/primitives/result-mark";
import { SurfaceToneContext } from "../../src/primitives/surface-context";
import { Text } from "../../src/primitives/text";

export default function Welcome() {
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <ResultMark variant="won" size={26} decorative />
          <Text size="title" width="expanded" weight="bold" uppercase>
            Temba
          </Text>
        </View>
        <View style={{ marginTop: 72, gap: 20 }}>
          <Text
            size="hero"
            width="expanded"
            weight="bold"
            accessibilityRole="header"
          >
            Find a game, fill the court, keep the score.
          </Text>
          <Text tone="muted" style={{ maxWidth: 300 }}>
            Open padel and football games near you, your regular Groups, and a
            Level that follows your results.
          </Text>
        </View>
        <View style={{ marginTop: 32, flexDirection: "row", gap: 8 }}>
          {SPORTS.map((sport) => (
            <View
              key={sport}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                height: 36,
                borderRadius: radii.md,
                borderWidth: hairline,
                borderColor: colors.dimrule,
                backgroundColor: colors.raised,
              }}
            >
              <SportGlyph sport={sport} color={colors.paper} size={16} />
              <Text size="meta" weight="medium">
                {SPORT_LABELS[sport]}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <Button
            label="Create account"
            size="lg"
            onPress={() => router.push("/sign-up")}
          />
          <Button
            label="Sign in"
            size="lg"
            variant="outline-inverse"
            onPress={() => router.push("/sign-in")}
          />
          <Text
            size="eyebrow"
            tone="muted"
            style={{ marginTop: 8, textAlign: "center" }}
          >
            By continuing you agree to the{" "}
            <Text
              size="eyebrow"
              accessibilityRole="link"
              onPress={() => router.push("/terms")}
              style={{ textDecorationLine: "underline" }}
            >
              Terms and Conditions
            </Text>
            .
          </Text>
        </View>
      </View>
    </SurfaceToneContext.Provider>
  );
}
