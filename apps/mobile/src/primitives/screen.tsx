import { colors, spacing } from "@repo/design-tokens";
import { useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hairline } from "./hairline-width";
import { createInkRegistry } from "./ink-registry";
import { isNearEnd } from "./scroll-end";
import { InkRegistryContext } from "./surface-context";

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onNearEnd?: () => void;
  /** Index among `children` of the one child that pins to the top on scroll. */
  stickyIndex?: number;
  onViewportHeight?: (height: number) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

const FOOTER_PADDING_Y = 14;

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  onNearEnd,
  stickyIndex,
  onViewportHeight,
  header,
  footer,
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

  // A pinned child sticks to the top of the scroll view, so the scroll view
  // starts below the status bar instead of padding its content past it.
  const sticky = stickyIndex !== undefined && !header;
  const content = {
    gap: spacing.section,
    paddingHorizontal: spacing.surface,
    paddingTop: header
      ? spacing.section
      : sticky
        ? spacing.surface
        : insets.top + spacing.surface,
    paddingBottom: footer ? spacing.section : insets.bottom + spacing.section,
  };
  const body = header ? (
    <>
      {header}
      <View style={content}>{children}</View>
    </>
  ) : (
    children
  );

  return (
    <InkRegistryContext.Provider value={registry}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          paddingTop: sticky ? insets.top : 0,
        }}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={header ? undefined : content}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={sticky ? [stickyIndex] : undefined}
            onLayout={
              onViewportHeight
                ? ({ nativeEvent }) =>
                    onViewportHeight(nativeEvent.layout.height)
                : undefined
            }
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
            {body}
          </ScrollView>
        ) : header ? (
          <View style={{ flex: 1 }}>{body}</View>
        ) : (
          <View style={[{ flex: 1 }, content]}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingTop: FOOTER_PADDING_Y,
              paddingBottom: FOOTER_PADDING_Y + insets.bottom,
              paddingHorizontal: spacing.surface,
              borderTopWidth: hairline,
              borderTopColor: colors.rule,
              backgroundColor: colors.paper,
            }}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </InkRegistryContext.Provider>
  );
}
