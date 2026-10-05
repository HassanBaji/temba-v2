import { colors, radii, spacing } from "@repo/design-tokens";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hairline } from "./hairline-width";
import { Section } from "./section";
import { SurfaceToneContext } from "./surface-context";

const SCRIM_OPACITY = 0.4;

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();

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
              paddingBottom: insets.bottom + spacing.surface,
            }}
          >
            <Section title={title}>{children}</Section>
          </View>
        </SurfaceToneContext.Provider>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
});
