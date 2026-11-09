import { radii, spacing } from "@repo/design-tokens";
import type { ChallengeTeamFaceView } from "@repo/domain/challenge-detail";
import type { Href } from "expo-router";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import { Fragment } from "react";
import { View, type ColorValue } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { HeaderIconButton, useLeaveScreen } from "../primitives/screen-header";
import { useSurfaceTone, useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const CREST = { lg: 56, sm: 34 } as const;
const CREST_RADIUS = { lg: radii.surface, sm: radii.sm } as const;
const VERSUS_WIDTH = 34;
const ROW_PADDING = { paddingVertical: 14, paddingHorizontal: 18 } as const;

function BackArrow(props: { size: number; color: ColorValue }) {
  return <ArrowLeft {...props} style={mirrorInRtl} />;
}

function BackChevron(props: { size: number; color: ColorValue }) {
  return <ChevronLeft {...props} style={mirrorInRtl} />;
}

/** The outlined mono "CHALLENGE" tag. */
export function ChallengeTag() {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.slot,
        paddingHorizontal: 7,
        paddingVertical: 3,
      }}
    >
      <Text size="eyebrow" tone="muted" mono uppercase>
        {m.challenge.marker}
      </Text>
    </View>
  );
}

/** Back and the tag: a bare arrow on paper, a framed chevron on ink. */
export function ChallengeHeaderRow({ fallback }: { fallback: Href }) {
  const m = useMessages();
  const leave = useLeaveScreen(fallback);
  const ink = useSurfaceTone() === "ink";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={ink ? undefined : { marginStart: -12 }}>
        <HeaderIconButton
          framed={ink}
          icon={ink ? BackChevron : BackArrow}
          accessibilityLabel={m.common.back}
          onPress={leave}
        />
      </View>
      <ChallengeTag />
    </View>
  );
}

/** A Team's crest: its initials on a solid square. `inverted` sits on a selected control. */
export function CrestTile({
  initials,
  size = "lg",
  inverted = false,
}: {
  initials: string;
  size?: keyof typeof CREST;
  inverted?: boolean;
}) {
  const palette = useTonePalette();
  const colors = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: CREST[size],
        height: CREST[size],
        borderRadius: CREST_RADIUS[size],
        backgroundColor: inverted ? colors.onControl : palette.control,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        size={size === "lg" ? "title" : "eyebrow"}
        weight="bold"
        width="expanded"
        style={{ color: inverted ? colors.control : palette.onControl }}
      >
        {initials}
      </Text>
    </View>
  );
}

function TeamColumn({ face }: { face: ChallengeTeamFaceView }) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 8 }}>
      <CrestTile initials={face.initials} />
      <View style={{ gap: 2, alignItems: "center" }}>
        <Text weight="semibold" style={{ textAlign: "center" }}>
          {face.name}
        </Text>
        {face.line ? (
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            {face.line}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MissingOpponent({ name, line }: { name: string; line: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 8 }}>
      <View style={{ width: CREST.lg, height: CREST.lg }}>
        <Hatch radius={CREST_RADIUS.lg} />
      </View>
      <View style={{ gap: 2, alignItems: "center" }}>
        <Text weight="semibold" tone="muted" style={{ textAlign: "center" }}>
          {name}
        </Text>
        <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
          {line}
        </Text>
      </View>
    </View>
  );
}

/**
 * Both Teams of a Challenge. Until a Proposal lands the second Team is a
 * hatched tile: the opponent is not there yet. Boxed on paper, open on ink.
 */
export function ChallengeTeamVsTeam({
  left,
  right,
  missing,
  boxed,
}: {
  left: ChallengeTeamFaceView;
  right: ChallengeTeamFaceView | null;
  missing: { name: string; line: string };
  boxed?: boolean;
}) {
  const m = useMessages();
  const palette = useTonePalette();
  const ink = useSurfaceTone() === "ink";
  const framed = boxed ?? !ink;
  const versus = m.challenge.detailScreen.versus;
  return (
    <View
      accessible
      accessibilityLabel={[
        left.accessibilityLabel,
        right?.accessibilityLabel ?? `${missing.name} ${missing.line}`,
      ].join(` ${versus} `)}
      style={[
        { flexDirection: "row", alignItems: "center", gap: 12 },
        framed
          ? {
              borderWidth: hairline,
              borderColor: palette.rule,
              borderRadius: radii.surface,
              padding: spacing.compact,
            }
          : null,
      ]}
    >
      <TeamColumn face={left} />
      <Text
        size="eyebrow"
        tone="muted"
        style={{ width: VERSUS_WIDTH, textAlign: "center" }}
      >
        {versus}
      </Text>
      {right ? (
        <TeamColumn face={right} />
      ) : (
        <MissingOpponent name={missing.name} line={missing.line} />
      )}
    </View>
  );
}

/** Label and value rows on one card, split by hairlines. */
export function ChallengeInfoRows({
  rows,
}: {
  rows: readonly { key: string; label: string; value: string }[];
}) {
  const palette = useTonePalette();
  const m = useMessages().mobileTournament;
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.card,
        overflow: "hidden",
        backgroundColor: palette.background,
      }}
    >
      {rows.map((row, index) => (
        <Fragment key={row.key}>
          {index > 0 ? <Hairline /> : null}
          <View
            accessible
            accessibilityLabel={m.infoRow(row.label, row.value)}
            style={{
              ...ROW_PADDING,
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <Text tone="muted">{row.label}</Text>
            <Text style={{ flexShrink: 1, textAlign: "right" }}>
              {row.value}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

/** "From the team" and the poster's note. */
export function ChallengeNote({ note }: { note: string }) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.card,
        paddingVertical: 16,
        paddingHorizontal: 18,
        gap: 4,
      }}
    >
      <Text size="eyebrow" tone="muted">
        {m.challenge.detailScreen.note}
      </Text>
      <Text>{note}</Text>
    </View>
  );
}

/** A small grey line under a card. */
export function ChallengeFootnote({ children }: { children: string }) {
  return (
    <Text size="eyebrow" tone="muted" style={{ marginTop: 8 }}>
      {children}
    </Text>
  );
}
