import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import {
  CREATE_FLOW_STEP_COUNT,
  type CreateFlowStep,
} from "@repo/domain/create-game-flow";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { ArrowRight, ChevronDown, Trophy, Users } from "lucide-react-native";
import { Fragment, useCallback } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { MountFill } from "../primitives/mount-fill";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { useTonePalette } from "../primitives/surface-context";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  nextStepTitle,
  type KickoffHero,
  type StepHeaderText,
} from "./create-header";
import { continueBlocked, type CreateState } from "./create-model";

const PROGRESS_HEIGHT = 3;
const HEADER_PADDING_BOTTOM = 20;
const CANCEL_WIDTH = 104;
const CONTEXT_ICONS = { users: Users, trophy: Trophy } as const;

export type StepShellProps = {
  step: CreateFlowStep | null;
  header: StepHeaderText;
  onBack?: () => void;
  upcoming?: readonly { step: number; title: string }[];
  footer?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
};

export function StepShell({
  step,
  header,
  onBack,
  upcoming = [],
  footer,
  refreshing,
  onRefresh,
  children,
}: StepShellProps) {
  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={<StepHeader step={step} header={header} onBack={onBack} />}
      footer={footer}
    >
      {children}
      {upcoming.length > 0 ? <UpcomingSteps steps={upcoming} /> : null}
    </Screen>
  );
}

function useLightStatusBar() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );
}

function StepHeader({
  step,
  header,
  onBack,
}: {
  step: CreateFlowStep | null;
  header: StepHeaderText;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  useLightStatusBar();
  const back = step !== null && step > 1 && onBack;
  const stepLabel =
    step === null ? null : (
      <Text size="eyebrow" mono uppercase tone="muted">
        {`Step ${step} of ${CREATE_FLOW_STEP_COUNT}`}
      </Text>
    );

  return (
    <Surface
      tone="ink"
      style={{
        paddingTop: insets.top + spacing.surface,
        paddingBottom: HEADER_PADDING_BOTTOM,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}
    >
      <ScreenHeader
        nav={back ? "back" : "close"}
        fallback="/games"
        onNav={back ? onBack : undefined}
        actions={stepLabel}
      >
        <HeaderText header={header} />
        {step !== null ? <Progress step={step} /> : null}
      </ScreenHeader>
    </Surface>
  );
}

function HeaderText({ header }: { header: StepHeaderText }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
      {header.hero ? (
        <Hero hero={header.hero} />
      ) : (
        <Text size="display" width="expanded" accessibilityRole="header">
          {header.title.join("\n")}
        </Text>
      )}
      {header.subtitle ? <Text tone="muted">{header.subtitle}</Text> : null}
      {header.context ? (
        <ContextRow icon={header.context.icon} parts={header.context.parts} />
      ) : null}
    </View>
  );
}

function Hero({ hero }: { hero: KickoffHero }) {
  const label = [`${hero.value} ${hero.unit}`.trim(), hero.trailing]
    .filter(Boolean)
    .join(" ");
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        columnGap: 8,
      }}
    >
      <Text size="hero" width="expanded">
        {hero.value}
      </Text>
      {hero.unit ? (
        <Text size="title" weight="medium">
          {hero.unit}
        </Text>
      ) : null}
      {hero.trailing ? (
        <Text size="title" tone="muted">
          {hero.trailing}
        </Text>
      ) : null}
    </View>
  );
}

function ContextRow({
  icon,
  parts,
}: {
  icon?: keyof typeof CONTEXT_ICONS;
  parts: readonly string[];
}) {
  const palette = useTonePalette();
  const Icon = icon ? CONTEXT_ICONS[icon] : null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {Icon ? <Icon size={sizes.iconRow} color={palette.muted} /> : null}
      <Text
        size="meta"
        tone="muted"
        accessibilityLabel={parts.join(", ")}
        style={{ flexShrink: 1 }}
      >
        {parts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <Text size="meta" style={{ color: colors.dimrule }}>
                {" / "}
              </Text>
            ) : null}
            {part}
          </Fragment>
        ))}
      </Text>
    </View>
  );
}

function Progress({ step }: { step: CreateFlowStep }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ flexDirection: "row", gap: 5 }}
    >
      {Array.from({ length: CREATE_FLOW_STEP_COUNT }, (_, index) => {
        const bar = index + 1;
        return (
          <View key={index} style={{ flex: 1 }}>
            {bar === step ? (
              <MountFill percent={100} height={PROGRESS_HEIGHT} />
            ) : (
              <View
                style={{
                  height: PROGRESS_HEIGHT,
                  borderRadius: radii.sm,
                  backgroundColor: bar < step ? colors.paper : colors.dimrule,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

function UpcomingSteps({
  steps,
}: {
  steps: readonly { step: number; title: string }[];
}) {
  return (
    <View>
      <Hairline />
      {steps.map((item) => (
        <View
          key={item.step}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 14,
          }}
        >
          <Text size="title" width="expanded" tone="muted" style={{ flex: 1 }}>
            {item.title}
          </Text>
          <Text size="eyebrow" mono uppercase tone="muted">
            {`Step ${item.step}`}
          </Text>
          <ChevronDown size={sizes.iconRow} color={colors.muted} />
        </View>
      ))}
    </View>
  );
}

export function StepFooter({
  state,
  pending,
  onContinue,
  onCancel,
}: {
  state: CreateState;
  pending: boolean;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const next = nextStepTitle(state.type, state.step);

  if (next === null || continueBlocked(state)) {
    const label =
      next !== null
        ? "Continue"
        : pending
          ? "Creating…"
          : state.type === "friendly_tournament"
            ? "Create tournament"
            : "Create Game";
    return (
      <>
        <View style={{ flex: 1 }}>
          <Button
            label={label}
            size="lg"
            pending={pending}
            disabled={next !== null}
            onPress={onContinue}
          />
        </View>
        <View style={{ width: CANCEL_WIDTH }}>
          <Button
            label="Cancel"
            variant="outline"
            size="lg"
            disabled={pending}
            onPress={onCancel}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text size="eyebrow" tone="muted">
          Next
        </Text>
        <Text size="meta" weight="semibold" numberOfLines={1}>
          {next}
        </Text>
      </View>
      <Button
        label="Continue"
        size="lg"
        icon={<ArrowRight size={sizes.iconAction} color={colors.paper} />}
        iconPlacement="trailing"
        onPress={onContinue}
      />
    </>
  );
}
