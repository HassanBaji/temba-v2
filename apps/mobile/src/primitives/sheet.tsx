import { radii, sizes, spacing } from "@repo/design-tokens";
import { X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMessages } from "../i18n/locale-provider";
import { useColors } from "../theme/theme-provider";
import { hairline } from "./hairline-width";
import { keyboardOverlap } from "./keyboard-overlap";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";
import { useKeyboardFrame } from "./use-keyboard-frame";

const TALL_HEIGHT_RATIO = 0.8;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 28;
const BLOCK_GAP = 18;
const BODY_GAP = 12;
const GRABBER = { width: 36, height: 4 };
const CLOSE_BUTTON = 36;
/** A downward drag this long on the sheet lowers the keyboard. */
const DISMISS_DRAG = 12;
/** Close to the curve iOS moves its keyboard on. */
const KEYBOARD_EASING = Easing.bezier(0.38, 0.7, 0.125, 1);

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string | null;
  /**
   * "display" is the sheet's own heading, expanded and bold. "lead" names
   * the thing the sheet acts on, as on a menu (design "Group create and edit
   * flow" 02).
   */
  titleSize?: "display" | "lead";
  /** A round Close button in the title row. */
  closeButton?: boolean;
  action?: React.ReactNode;
  tall?: boolean;
  /** Pinned under the body: under the scrolling body of a tall sheet. */
  footer?: React.ReactNode;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  /** The scrolling body of a tall sheet. */
  scrollRef?: React.Ref<ScrollView>;
  children: React.ReactNode;
};

/** The bottom sheet every action opens in: scrim, grabber, title, body. */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  titleSize = "display",
  closeButton = false,
  action,
  tall = false,
  footer,
  keyboardShouldPersistTaps,
  scrollRef,
  children,
}: SheetProps) {
  const m = useMessages();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const keyboard = useKeyboardFrame();
  const keyboardVisible = keyboard.top != null;
  const [rootHeight, setRootHeight] = useState(window.height);
  const lift = useKeyboardLift(
    keyboardOverlap(rootHeight, keyboard.top),
    keyboard.duration,
  );
  const lowerKeyboard = useLowerKeyboardOnDrag();
  // The keyboard covers the home indicator, so its inset is wasted room then.
  const bottomPadding = keyboardVisible
    ? BODY_GAP
    : Math.max(PADDING_BOTTOM, insets.bottom + BODY_GAP);
  const trailing =
    action ?? (closeButton ? <SheetCloseButton onPress={onClose} /> : null);
  const hasHeader = Boolean(title) || Boolean(subtitle) || trailing != null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={styles.root}
        onLayout={({ nativeEvent }) => setRootHeight(nativeEvent.layout.height)}
      >
        {/* While typing, a tap outside the sheet lowers the keyboard rather
            than throwing away what was typed. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.common.close}
          onPress={keyboardVisible ? Keyboard.dismiss : onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        />
        <Animated.View
          pointerEvents="box-none"
          style={[styles.lift, { paddingTop: insets.top, paddingBottom: lift }]}
        >
          <SurfaceToneContext.Provider value="paper">
            <View
              accessibilityViewIsModal
              {...lowerKeyboard.panHandlers}
              style={{
                backgroundColor: colors.sheet,
                borderTopLeftRadius: radii.sheet,
                borderTopRightRadius: radii.sheet,
                paddingTop: PADDING_TOP,
                paddingHorizontal: spacing.surface,
                paddingBottom: tall ? 0 : bottomPadding,
                height: tall
                  ? Math.round(window.height * TALL_HEIGHT_RATIO)
                  : undefined,
                flexShrink: 1,
                gap: BLOCK_GAP,
              }}
            >
              <Grabber />
              {hasHeader ? (
                <TitleRow
                  title={title}
                  subtitle={subtitle}
                  size={titleSize}
                  trailing={trailing}
                />
              ) : null}
              {tall ? (
                <ScrollView
                  ref={scrollRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    gap: BODY_GAP,
                    paddingBottom: footer ? spacing.surface : bottomPadding,
                  }}
                  keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                  keyboardDismissMode="on-drag"
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={{ gap: BODY_GAP }}>{children}</View>
              )}
              {!tall && footer ? <View>{footer}</View> : null}
              {tall && footer ? (
                <View
                  style={{
                    borderTopWidth: hairline,
                    borderColor: colors.rule,
                    paddingTop: spacing.compact,
                    paddingBottom: bottomPadding,
                    marginTop: -BLOCK_GAP,
                  }}
                >
                  {footer}
                </View>
              ) : null}
            </View>
          </SurfaceToneContext.Provider>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * The room the sheet keeps under itself for the keyboard. It follows the
 * keyboard on the keyboard's own timing; a LayoutAnimation here let the
 * tall sheet overshoot past the top of the screen while it settled.
 */
function useKeyboardLift(overlap: number, duration: number) {
  const lift = useRef(new Animated.Value(overlap)).current;
  useEffect(() => {
    const animation = Animated.timing(lift, {
      toValue: overlap,
      duration: Platform.OS === "ios" ? duration : 0,
      easing: KEYBOARD_EASING,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [lift, overlap, duration]);
  return lift;
}

/** Dragging the sheet down lowers the keyboard; the sheet stays open. */
function useLowerKeyboardOnDrag() {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Keyboard.isVisible() &&
          gesture.dy > DISMISS_DRAG &&
          gesture.dy > Math.abs(gesture.dx),
        onPanResponderGrant: () => Keyboard.dismiss(),
      }),
    [],
  );
}

export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.common.close}
      hitSlop={(sizes.touchTarget - CLOSE_BUTTON) / 2}
      onPress={onPress}
      style={({ pressed }) => ({
        width: CLOSE_BUTTON,
        height: CLOSE_BUTTON,
        borderRadius: CLOSE_BUTTON / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.wash,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <X size={sizes.iconRow} color={colors.ink} />
    </Pressable>
  );
}

function Grabber() {
  const colors = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        alignSelf: "center",
        ...GRABBER,
        borderRadius: GRABBER.height / 2,
        backgroundColor: colors.rule,
      }}
    />
  );
}

function TitleRow({
  title,
  subtitle,
  size,
  trailing,
}: {
  title?: string;
  subtitle?: string | null;
  size: "display" | "lead";
  trailing: React.ReactNode;
}) {
  const heading = title ? (
    size === "lead" ? (
      <Text size="lead" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
    ) : (
      <Text size="h2" width="expanded" accessibilityRole="header">
        {title}
      </Text>
    )
  ) : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: BODY_GAP,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: size === "lead" ? 2 : 8 }}>
        {heading}
        {subtitle ? (
          <Text size={size === "lead" ? "meta" : "body"} tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  lift: { flex: 1, justifyContent: "flex-end" },
});
