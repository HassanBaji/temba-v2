import { colors, spacing } from "@repo/design-tokens";
import { useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createInkRegistry } from "./ink-registry";
import { isNearEnd } from "./scroll-end";
import { InkRegistryContext } from "./surface-context";

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onNearEnd?: () => void;
};

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  onNearEnd,
}: ScreenProps) {
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
            scrollEventThrottle={onNearEnd ? 100 : undefined}
            onScroll={
              onNearEnd
                ? ({ nativeEvent }) => {
                    if (
                      isNearEnd({
                        contentOffsetY: nativeEvent.contentOffset.y,
                        layoutHeight: nativeEvent.layoutMeasurement.height,
                        contentHeight: nativeEvent.contentSize.height,
                      })
                    ) {
                      onNearEnd();
                    }
                  }
                : undefined
            }
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.muted}
                />
              ) : undefined
            }
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
