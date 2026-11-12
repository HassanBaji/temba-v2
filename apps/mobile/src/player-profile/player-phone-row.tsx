import { radii, sizes } from "@repo/design-tokens";
import { displayPhone } from "@repo/domain/phone-number";
import { Phone } from "lucide-react-native";
import { Linking, Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/** A Group approver's way to call a member of one of their Groups (ADR-0078). */
export function PlayerPhoneRow({
  name,
  phoneNumber,
}: {
  name: string;
  phoneNumber: string;
}) {
  const m = useMessages();
  const colors = useColors();
  const page = m.profile.playerPage;
  const phone = displayPhone(phoneNumber);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={page.callPhone(name, phone)}
      accessibilityHint={page.phoneNote}
      onPress={() => void Linking.openURL(`tel:${phoneNumber}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: pressed ? colors.wash : colors.paper,
      })}
    >
      <Phone size={sizes.iconRow + 2} color={colors.ink} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="eyebrow" tone="muted">
          {page.phoneLabel}
        </Text>
        <Text weight="semibold" ltr>
          {phone}
        </Text>
        <Text size="eyebrow" tone="muted">
          {page.phoneNote}
        </Text>
      </View>
    </Pressable>
  );
}
