import { colors, radii, spacing } from "@repo/design-tokens";
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

import { hairline } from "./hairline-width";
import { Section } from "./section";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";

const SCRIM_OPACITY = 0.4;
const TALL_HEIGHT_RATIO = 0.8;
const TITLE_GAP = 12;
const GRABBER = { width: 36, height: 4 };

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  action?: React.ReactNode;
  tall?: boolean;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  children: React.ReactNode;
};

export function Sheet({
  visible,
  onClose,
  title,
  action,
  tall = false,
  keyboardShouldPersistTaps,
  children,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const bottomPadding = insets.bottom + spacing.surface;

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
          accessibilityLabel="Close"
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
              borderTopLeftRadius: radii.surface,
              borderTopRightRadius: radii.surface,
              borderTopWidth: hairline,
              borderColor: colors.rule,
              padding: spacing.surface,
              paddingBottom: tall ? 0 : bottomPadding,
              height: tall
                ? Math.round(window.height * TALL_HEIGHT_RATIO)
                : undefined,
            }}
          >
            {tall ? <Grabber /> : null}
            {tall || action ? (
              <View style={{ flex: tall ? 1 : undefined, gap: TITLE_GAP }}>
                <TitleRow title={title} action={action} />
                {tall ? (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                      gap: TITLE_GAP,
                      paddingBottom: bottomPadding,
                    }}
                    keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                    automaticallyAdjustKeyboardInsets
                  >
                    {children}
                  </ScrollView>
                ) : (
                  children
                )}
              </View>
            ) : (
              <Section title={title}>{children}</Section>
            )}
          </View>
        </SurfaceToneContext.Provider>
      </View>
    </Modal>
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
        marginTop: -spacing.surface / 2,
        marginBottom: spacing.surface / 2,
      }}
    />
  );
}

function TitleRow({
  title,
  action,
}: {
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: TITLE_GAP,
      }}
    >
      {title ? (
        <Text
          size="title"
          width="expanded"
          accessibilityRole="header"
          style={{ flexShrink: 1 }}
        >
          {title}
        </Text>
      ) : (
        <View />
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
});
