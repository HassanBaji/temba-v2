import { colors, radii } from "@repo/design-tokens";
import {
  CALLING_COUNTRIES,
  callingCountryByIso,
  countryFlagEmoji,
  formatNationalNumber,
} from "@repo/domain/phone-number";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export type PhoneFieldProps = {
  label: string;
  countryIso: string;
  national: string;
  onCountryIsoChange: (iso: string) => void;
  onNationalChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

export function PhoneField({
  label,
  countryIso,
  national,
  onCountryIsoChange,
  onNationalChange,
  error,
  disabled = false,
}: PhoneFieldProps) {
  const [picking, setPicking] = useState(false);
  const country = callingCountryByIso(countryIso);

  return (
    <View>
      <TextField
        label={label}
        error={error}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        editable={!disabled}
        placeholder={country?.placeholder}
        value={formatNationalNumber(countryIso, national)}
        onChangeText={onNationalChange}
        leading={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Country code, ${country?.name ?? countryIso}`}
            disabled={disabled}
            onPress={() => setPicking(true)}
            style={{
              height: 48,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: radii.md,
              borderWidth: error ? 2 : hairline,
              borderColor: error ? colors.ink : colors.inputBorder,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Text>{countryFlagEmoji(countryIso)}</Text>
            <Text>+{country?.callingCode}</Text>
          </Pressable>
        }
      />
      <Sheet
        visible={picking}
        onClose={() => setPicking(false)}
        title="Country code"
      >
        {CALLING_COUNTRIES.map((item) => (
          <Pressable
            key={item.iso}
            accessibilityRole="button"
            accessibilityState={{ selected: item.iso === countryIso }}
            onPress={() => {
              onCountryIsoChange(item.iso);
              setPicking(false);
            }}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text>{countryFlagEmoji(item.iso)}</Text>
            <Text
              weight={item.iso === countryIso ? "semibold" : "regular"}
              style={{ flex: 1 }}
            >
              {item.name}
            </Text>
            <Text tone="muted">+{item.callingCode}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
