import { colors } from "@repo/design-tokens";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";

export type AuthScreenProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  onBack?: () => void;
  crossLink?: { label: string; onPress: () => void };
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function goBackOrWelcome() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/welcome");
}

function HeaderLink(props: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={props.label}
      hitSlop={8}
      onPress={props.onPress}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Text tone="muted">{props.label}</Text>
    </Pressable>
  );
}

export function AuthScreen({
  title,
  eyebrow,
  description,
  onBack,
  crossLink,
  footer,
  children,
}: AuthScreenProps) {
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {onBack ? (
          <HeaderLink label="Back" onPress={onBack} />
        ) : (
          <View style={{ width: 44 }} />
        )}
        {crossLink ? <HeaderLink {...crossLink} /> : null}
      </View>
      {title || eyebrow || description ? (
        <View style={{ gap: 10 }}>
          {eyebrow ? (
            <Text size="meta" tone="muted">
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text size="h1Lg" weight="bold" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {description ? <Text tone="muted">{description}</Text> : null}
        </View>
      ) : null}
      <View style={{ gap: 18 }}>{children}</View>
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.rule,
            paddingTop: 18,
          }}
        >
          {footer}
        </View>
      ) : null}
    </Screen>
  );
}
