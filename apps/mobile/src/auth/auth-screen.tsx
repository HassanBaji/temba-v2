import { sizes } from "@repo/design-tokens";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

export type AuthScreenProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  onBack?: () => void;
  crossLink?: { label: string; onPress: () => void };
  /** Mono eyebrow in the header's right slot, such as "Profile / Photo". */
  meta?: string;
  progress?: { step: number; total: number; label?: string };
  footer?: React.ReactNode;
  /** Pinned below the scroll, for the screen's one primary action. */
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function goBackOrWelcome() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/welcome");
}

function BackButton(props: { onPress: () => void }) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.common.back}
      hitSlop={8}
      onPress={props.onPress}
      style={{
        width: sizes.touchTarget,
        height: sizes.touchTarget,
        marginStart: -12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ArrowLeft
        size={sizes.iconAction}
        color={colors.ink}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}

function HeaderLink(props: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={props.label}
      hitSlop={8}
      onPress={props.onPress}
      style={{ minHeight: sizes.touchTarget, justifyContent: "center" }}
    >
      <Text tone="muted">{props.label}</Text>
    </Pressable>
  );
}

function ProgressSegments(props: {
  step: number;
  total: number;
  label?: string;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={
        props.label ?? m.mobileHome.authScreen.stepOf(props.step, props.total)
      }
      accessibilityValue={{ min: 0, max: props.total, now: props.step }}
      style={{ flexDirection: "row", gap: 6, marginTop: -12 }}
    >
      {Array.from({ length: props.total }, (_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: index < props.step ? colors.ink : colors.rule,
          }}
        />
      ))}
    </View>
  );
}

export function AuthScreen({
  title,
  eyebrow,
  description,
  onBack,
  crossLink,
  meta,
  progress,
  footer,
  action,
  children,
}: AuthScreenProps) {
  const m = useMessages();
  const colors = useColors();
  const headerMeta = meta ?? progress?.label;
  return (
    <Screen
      footer={
        action ? <View style={{ flex: 1, gap: 10 }}>{action}</View> : undefined
      }
    >
      <View
        style={{
          minHeight: sizes.touchTarget,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {onBack ? (
          <BackButton onPress={onBack} />
        ) : (
          <View style={{ width: sizes.touchTarget }} />
        )}
        {crossLink ? (
          <HeaderLink {...crossLink} />
        ) : headerMeta ? (
          <Text size="eyebrow" tone="muted" mono uppercase>
            {headerMeta}
          </Text>
        ) : progress ? (
          <Text
            size="eyebrow"
            tone="muted"
            mono
            uppercase
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {m.mobileHome.authScreen.stepOf(progress.step, progress.total)}
          </Text>
        ) : null}
      </View>
      {progress ? <ProgressSegments {...progress} /> : null}
      {title || eyebrow || description ? (
        <View style={{ gap: 10 }}>
          {eyebrow ? (
            <Text size="eyebrow" tone="muted" mono uppercase>
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
