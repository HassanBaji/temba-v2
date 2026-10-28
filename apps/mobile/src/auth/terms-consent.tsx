import { colors, radii } from "@repo/design-tokens";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { TERMS_MINIMUM_AGE } from "../legal/terms";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";

const BOX = 22;

export function TermsConsent(props: {
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: props.agreed, disabled: props.disabled }}
      accessibilityLabel={`I am ${TERMS_MINIMUM_AGE} or older and agree to the Terms and Conditions`}
      disabled={props.disabled}
      onPress={() => props.onChange(!props.agreed)}
      style={{
        minHeight: 44,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingTop: 4,
      }}
    >
      <View
        style={{
          width: BOX,
          height: BOX,
          marginTop: 1,
          borderRadius: radii.slot + 1,
          borderWidth: hairline,
          borderColor: props.agreed ? colors.ink : colors.inputBorder,
          backgroundColor: props.agreed ? colors.ink : colors.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {props.agreed ? <Check size={14} color={colors.paper} /> : null}
      </View>
      <Text size="meta" tone="muted" style={{ flex: 1 }}>
        I am {TERMS_MINIMUM_AGE} or older and agree to the{" "}
        <Text
          size="meta"
          accessibilityRole="link"
          onPress={() =>
            router.push({ pathname: "/terms", params: { from: "sign-up" } })
          }
          style={{ textDecorationLine: "underline" }}
        >
          Terms and Conditions
        </Text>
        , including how Temba uses my data.
      </Text>
    </Pressable>
  );
}
