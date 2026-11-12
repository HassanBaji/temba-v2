import { spacing } from "@repo/design-tokens";
import {
  lastTenOrder,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import { WIN_RATE_MIN_MATCHES } from "@repo/domain/win-rate";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { SectionTitle } from "./section-title";

const MARK = 22;
const BAR_HEIGHT = 8;

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
      <Text size="statTotal" width="expanded" weight="bold">
        {value}
      </Text>
      <Text size="meta" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function SplitBar({ form }: { form: RecentFormView }) {
  const colors = useColors();
  const parts = [
    { key: "won", flex: form.wins, color: colors.ink, outlined: false },
    { key: "drawn", flex: form.draws, color: colors.muted, outlined: false },
    { key: "lost", flex: form.losses, color: colors.paper, outlined: true },
  ].filter((part) => part.flex > 0);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 2, height: BAR_HEIGHT }}
    >
      {parts.map((part) => (
        <View
          key={part.key}
          style={{
            flex: part.flex,
            borderRadius: 2,
            backgroundColor: part.color,
            borderWidth: part.outlined ? 1 : 0,
            borderColor: colors.ink,
          }}
        />
      ))}
    </View>
  );
}

export function RecentFormCard({ form }: { form: RecentFormView }) {
  const m = useMessages();
  const colors = useColors();
  const copy = m.home.lastTen;
  const showRate = form.playedCount >= WIN_RATE_MIN_MATCHES;

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={copy.title} meta={copy.oldestFirst} />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        <View
          accessible
          accessibilityLabel={copy.spoken(form.wins, form.draws, form.losses)}
          style={{ padding: spacing.surface, gap: 14 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              flexWrap: "wrap",
              columnGap: 16,
            }}
          >
            <Figure value={form.wins} label={copy.won} />
            {form.draws > 0 ? (
              <Figure value={form.draws} label={copy.drawn} />
            ) : null}
            <Figure value={form.losses} label={copy.lost} />
            {showRate ? (
              <Text size="meta" tone="muted" style={{ marginStart: "auto" }}>
                <Text size="meta" weight="bold">
                  {copy.percentWon(form.winRatePercent)}
                </Text>{" "}
                {copy.percentWonLabel}
              </Text>
            ) : null}
          </View>
          <SplitBar form={form} />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing.surface,
            paddingVertical: 14,
            borderTopWidth: hairline,
            borderTopColor: colors.rule,
          }}
        >
          {lastTenOrder(form.bars).map((bar, index) => (
            <ResultMark
              key={index}
              size={MARK}
              variant={bar.kind === "empty" ? "not-played" : bar.outcome}
            />
          ))}
        </View>
      </Surface>
    </View>
  );
}
