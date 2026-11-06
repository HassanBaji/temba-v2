import { radii } from "@repo/design-tokens";
import {
  CALLING_COUNTRIES,
  callingCountryByIso,
  callingCountryName,
  countryFlagEmoji,
  formatNationalNumber,
} from "@repo/domain/phone-number";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";

export type PhoneFieldProps = {
  label: string;
  countryIso: string;
  national: string;
  onCountryIsoChange: (iso: string) => void;
  onNationalChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function PhoneField({
  label,
  countryIso,
  national,
  onCountryIsoChange,
  onNationalChange,
  error,
  disabled = false,
  placeholder,
}: PhoneFieldProps) {
  const m = useMessages();
  const colors = useColors();
  const locale = useLocale();
  const [picking, setPicking] = useState(false);
  const country = callingCountryByIso(countryIso);

  return (
    <View>
      <TextField
        label={label}
        error={error}
        keyboardType="phone-pad"
        ltr="row"
        textContentType="telephoneNumber"
        autoComplete="tel"
        editable={!disabled}
        placeholder={placeholder ?? country?.placeholder}
        value={formatNationalNumber(countryIso, national)}
        onChangeText={onNationalChange}
        leading={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.mobileHome.phoneField.countryCode(
              country ? callingCountryName(countryIso, locale) : countryIso,
            )}
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
            <Text ltr>+{country?.callingCode}</Text>
          </Pressable>
        }
      />
      <Sheet
        visible={picking}
        onClose={() => setPicking(false)}
        title={m.mobileHome.phoneField.countryCodeTitle}
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
              {callingCountryName(item.iso, locale)}
            </Text>
            <Text tone="muted" ltr>
              +{item.callingCode}
            </Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
