import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import { X } from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "./hairline-width";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";

const SCRIM_OPACITY = 0.45;
const TALL_HEIGHT_RATIO = 0.8;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 28;
const BLOCK_GAP = 18;
const BODY_GAP = 12;
const GRABBER = { width: 36, height: 4 };
const CLOSE_BUTTON = 36;

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
  /** Pinned under the scrolling body of a tall sheet. */
  footer?: React.ReactNode;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
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
  children,
}: SheetProps) {
  const m = useMessages();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const bottomPadding = Math.max(PADDING_BOTTOM, insets.bottom + BODY_GAP);
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
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.common.close}
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.ink, opacity: SCRIM_OPACITY },
          ]}
        />
        <SurfaceToneContext.Provider value="paper">
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.paper,
              borderTopLeftRadius: radii.sheet,
              borderTopRightRadius: radii.sheet,
              paddingTop: PADDING_TOP,
              paddingHorizontal: spacing.surface,
              paddingBottom: tall ? 0 : bottomPadding,
              height: tall
                ? Math.round(window.height * TALL_HEIGHT_RATIO)
                : undefined,
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
                style={{ flex: 1 }}
                contentContainerStyle={{
                  gap: BODY_GAP,
                  paddingBottom: footer ? spacing.surface : bottomPadding,
                }}
                keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                automaticallyAdjustKeyboardInsets
              >
                {children}
              </ScrollView>
            ) : (
              <View style={{ gap: BODY_GAP }}>{children}</View>
            )}
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
      </View>
    </Modal>
  );
}

export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  const m = useMessages();
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
  root: { flex: 1, justifyContent: "flex-end" },
});
