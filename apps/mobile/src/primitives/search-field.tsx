import { colors, radii, sizes, typeScale } from "@repo/design-tokens";
import { Search } from "lucide-react-native";
import { forwardRef } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { fontFamilyFor } from "./font-family";
import { hairline } from "./hairline-width";
import { Text } from "./text";

const FIELD_HEIGHT = 46;

export type SearchFieldProps = Omit<
  TextInputProps,
  "style" | "value" | "onChangeText"
> & {
  value: string;
  onChangeText: (value: string) => void;
};

export const SearchField = forwardRef<TextInput, SearchFieldProps>(
  function SearchField({ value, onChangeText, ...props }, ref) {
    return (
      <View
        style={{
          height: FIELD_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingLeft: 14,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: colors.ink,
          backgroundColor: colors.paper,
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          <Search size={sizes.iconRow} color={colors.muted} />
        </View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.muted}
          selectionColor={colors.ink}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          {...props}
          style={{
            flex: 1,
            height: "100%",
            color: colors.ink,
            fontFamily: fontFamilyFor({
              weight: "regular",
              width: "normal",
              mono: false,
            }),
            fontSize: typeScale.body.size,
          }}
        />
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onChangeText("")}
            style={{
              minWidth: sizes.touchTarget,
              height: sizes.touchTarget,
              paddingHorizontal: 14,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text size="meta" weight="medium">
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  },
);
