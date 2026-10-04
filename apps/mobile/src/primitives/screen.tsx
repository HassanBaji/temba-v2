import { colors, spacing } from "@repo/design-tokens";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createInkRegistry } from "./ink-registry";
import { InkRegistryContext } from "./surface-context";

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const registry = useMemo(
    () =>
      createInkRegistry((message) => {
        if (__DEV__) {
          console.warn(message);
        }
      }),
    [],
  );

  const content = {
    gap: spacing.section,
    paddingHorizontal: spacing.compact,
    paddingTop: insets.top + spacing.compact,
    paddingBottom: insets.bottom + spacing.section,
  };

  return (
    <InkRegistryContext.Provider value={registry}>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, content]}>{children}</View>
        )}
      </View>
    </InkRegistryContext.Provider>
  );
}
