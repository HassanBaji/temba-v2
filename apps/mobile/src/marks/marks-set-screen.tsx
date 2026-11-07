import { radii, spacing } from "@repo/design-tokens";
import type { MarkCoinSize } from "@repo/design-tokens/marks";
import {
  COIN_KINDS,
  GIVER_GROUPS,
  MARK_META,
  giverGroupLabel,
  markDescription,
  markName,
  type CoinKind,
} from "@repo/domain/marks";
import { sportLabel } from "@repo/domain/sport";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Section } from "../primitives/section";
import { useTonePalette } from "../primitives/surface-context";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { MarkCoin } from "./mark-coin";

const SMALL_SIZES: MarkCoinSize[] = ["cabinet", "row"];
const COIN_GAP = 12;

function CoinPair({ kind, size }: { kind: CoinKind; size: MarkCoinSize }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: COIN_GAP }}>
      <MarkCoin kind={kind} size={size} />
      <MarkCoin kind={kind} size={size} state="notYet" />
    </View>
  );
}

function CoinEntry({ kind }: { kind: CoinKind }) {
  const locale = useLocale();
  const palette = useTonePalette();
  const sports = kind === "mvp" ? [] : MARK_META[kind].sports;

  return (
    <View
      style={{
        gap: COIN_GAP,
        padding: spacing.compact,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: palette.rule,
      }}
    >
      <CoinPair kind={kind} size="set" />
      {SMALL_SIZES.map((size) => (
        <CoinPair key={size} kind={kind} size={size} />
      ))}
      <View style={{ gap: 2 }}>
        <Text size="lead" weight="semibold">
          {markName(kind, "en")}
        </Text>
        <Text size="lead" weight="semibold">
          {markName(kind, "ar")}
        </Text>
        <Text size="meta" tone="muted">
          {markDescription(kind, locale)}
        </Text>
        {sports.length === 1 ? (
          <Text size="meta" tone="muted">
            {sports.map((sport) => sportLabel(sport, locale)).join(", ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function CoinGroup({ title, kinds }: { title: string; kinds: CoinKind[] }) {
  return (
    <Section title={title}>
      {kinds.map((kind) => (
        <CoinEntry key={kind} kind={kind} />
      ))}
    </Section>
  );
}

/** Development only: the set (mockup 0a) at 120, 44 and 20, earned and not yet. */
export function MarksSetScreen() {
  const m = useMessages();
  const locale = useLocale();

  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile"
        title={m.marks.cabinet.title}
      />
      {GIVER_GROUPS.map((group) => (
        <CoinGroup
          key={group}
          title={giverGroupLabel(group, locale)}
          kinds={COIN_KINDS.filter(
            (kind) => kind !== "mvp" && MARK_META[kind].group === group,
          )}
        />
      ))}
      <CoinGroup title={markName("mvp", locale)} kinds={["mvp"]} />
      <Surface tone="ink">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: COIN_GAP }}>
          {COIN_KINDS.map((kind) => (
            <CoinPair key={kind} kind={kind} size="cabinet" />
          ))}
        </View>
      </Surface>
    </Screen>
  );
}
