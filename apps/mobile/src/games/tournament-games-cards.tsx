import { palettes, radii, sizes } from "@repo/design-tokens";
import type {
  HubGameRow,
  HubHistoryRow,
  MyTournament,
  MyTournamentPair,
} from "@repo/domain/hub-game-row";
import {
  tournamentGamesCardModel,
  tournamentPlayedCardModel,
  type TournamentGamesCardAction,
  type TournamentRoundCell,
} from "@repo/domain/tournament-games-card";
import {
  ArrowRight,
  ListOrdered,
  MapPin,
  PenLine,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, View } from "react-native";

import { LiftedCard } from "../home/up-next-card";
import { mirrorInRtl } from "../i18n/rtl";
import { useLocale } from "../i18n/locale-provider";
import { SportGlyph } from "../lib/sport-glyph";
import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ResultMark } from "../primitives/result-mark";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors, useColorSchemeName } from "../theme/theme-provider";
import { useNow } from "./use-now";

const PAIR_SQUARE = 30;
const STEP_TILE = 32;
const ICON = 16;
const SMALL_ICON = 14;
const CELL_MIN_HEIGHT = 74;
const ACTION_HEIGHT = 48;

const STEP_ICONS: Record<"playing" | "first" | "next", LucideIcon> = {
  playing: PenLine,
  first: ListOrdered,
  next: ListOrdered,
};

type Tone = { rule: string; raised: string };

/** Lifted roles of Palette v2 on the next thing the viewer plays (ADR-0066). */
function useTone(lifted: boolean): Tone {
  const colors = useColors();
  const v2 = palettes[useColorSchemeName()];
  return lifted
    ? { rule: v2.dimrule, raised: v2.raised }
    : { rule: colors.rule, raised: colors.wash };
}

export type TournamentCardTarget = TournamentGamesCardAction["target"];

function TeamPair({ pair }: { pair: MyTournamentPair }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row" }}
    >
      {[pair.left, pair.right].map((occupant, index) => (
        <View
          key={occupant?.userId ?? `open-${index}`}
          style={{ marginStart: index > 0 ? -6 : 0 }}
        >
          {occupant ? (
            <Avatar
              name={occupant.name}
              uri={occupant.image}
              radius={radii.sm}
            />
          ) : (
            <View style={{ width: PAIR_SQUARE, height: PAIR_SQUARE }}>
              <Hatch radius={radii.sm} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function resultVariant(cell: TournamentRoundCell) {
  return cell.state === "won" || cell.state === "lost" || cell.state === "draw"
    ? cell.state
    : null;
}

function RoundCell({ cell, tone }: { cell: TournamentRoundCell; tone: Tone }) {
  const colors = useColors();
  const result = resultVariant(cell);
  const onCourt = cell.state === "on_court";
  const quiet =
    result != null || cell.state === "later" || cell.state === "no_score";
  return (
    <View
      accessible
      accessibilityLabel={cell.accessibilityLabel}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: CELL_MIN_HEIGHT,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: onCourt ? colors.ink : tone.rule,
        paddingHorizontal: 8,
        paddingVertical: 8,
        overflow: "hidden",
      }}
    >
      {cell.hatched ? <Hatch radius={radii.lg} bordered={false} /> : null}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text size="eyebrow" tone="muted">
          {cell.label}
        </Text>
        {result ? (
          <ResultMark variant={result} size={SMALL_ICON} decorative />
        ) : onCourt ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.ink,
            }}
          />
        ) : null}
      </View>
      <Text
        size={result ? "lead" : "eyebrow"}
        weight={result ? "bold" : "semibold"}
        numberOfLines={1}
        style={{ marginTop: 4, opacity: cell.stateLine ? 1 : 0 }}
      >
        {cell.stateLine ?? "–"}
      </Text>
      {cell.opponentNames.map((name) => (
        <Text
          key={name}
          size="eyebrow"
          tone={quiet ? "muted" : "default"}
          numberOfLines={1}
        >
          {name}
        </Text>
      ))}
    </View>
  );
}

function RoundCells({
  cells,
  tone,
}: {
  cells: readonly TournamentRoundCell[];
  tone: Tone;
}) {
  const rows: TournamentRoundCell[][] = [];
  for (let index = 0; index < cells.length; index += 4) {
    rows.push(cells.slice(index, index + 4));
  }
  return (
    <View style={{ gap: 6 }}>
      {rows.map((row, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 6 }}>
          {row.map((cell) => (
            <RoundCell key={cell.matchId} cell={cell} tone={tone} />
          ))}
          {Array.from({ length: 4 - row.length }, (_, filler) => (
            <View key={`filler-${filler}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Rule({ tone }: { tone: Tone }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: hairline,
        backgroundColor: tone.rule,
        marginVertical: 14,
      }}
    />
  );
}

function ActionButton({
  label,
  primary,
  icon: Icon,
  tone,
  onPress,
}: {
  label: string;
  primary: boolean;
  icon?: LucideIcon;
  tone: Tone;
  onPress: () => void;
}) {
  const colors = useColors();
  const foreground = primary ? colors.paper : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: primary ? 1 : undefined,
        minWidth: primary ? undefined : 96,
        height: ACTION_HEIGHT,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: radii.lg,
        backgroundColor: primary ? colors.ink : tone.raised,
        borderWidth: primary ? 0 : hairline,
        borderColor: tone.rule,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {Icon ? <Icon size={ICON} color={foreground} /> : null}
      <Text weight="semibold" numberOfLines={1} style={{ color: foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlainCard({ children }: { children: React.ReactNode }) {
  return <Surface tone="paper">{children}</Surface>;
}

/** One upcoming or live Groups only tournament (ADR-0074). */
export function TournamentGamesCard({
  game,
  lifted,
  onOpen,
}: {
  game: HubGameRow & { myTournament: MyTournament };
  lifted: boolean;
  onOpen: (target: TournamentCardTarget) => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const now = useNow();
  const tone = useTone(lifted);
  const view = tournamentGamesCardModel(game, now, locale);
  const StepIcon = view.step ? STEP_ICONS[view.step.kind] : null;
  const Card = lifted ? LiftedCard : PlainCard;
  const spoken = [
    game.name,
    view.formatLabel,
    view.dayLine,
    `${view.time} ${view.meridiem}`.trim(),
    view.status,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        onPress={() => onOpen("tournament")}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {game.sport ? (
            <SportGlyph
              sport={game.sport}
              color={colors.ink}
              size={SMALL_ICON}
            />
          ) : null}
          <Text size="meta" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
            {view.sportLabel ? (
              <Text size="meta" weight="semibold">
                {view.sportLabel}
              </Text>
            ) : null}
            <Text size="meta" tone="muted">{`  ${view.formatLabel}`}</Text>
          </Text>
          {view.status ? (
            <Text size="meta" weight="semibold" numberOfLines={1}>
              {view.status}
            </Text>
          ) : null}
        </View>
        <Text size="meta" tone="muted" style={{ marginTop: 12 }}>
          {view.dayLine}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            columnGap: 8,
          }}
        >
          <Text size="record" width="expanded" weight="bold">
            {view.time}
          </Text>
          {view.meridiem ? (
            <Text size="title" width="expanded" weight="bold">
              {view.meridiem}
            </Text>
          ) : null}
          {view.untilLine ? (
            <Text size="meta" tone="muted">
              {view.untilLine}
            </Text>
          ) : null}
        </View>
        {view.venueLine ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
            }}
          >
            <MapPin size={15} color={colors.muted} />
            <Text numberOfLines={1} style={{ flexShrink: 1 }}>
              {view.venueLine}
            </Text>
          </View>
        ) : null}
        <Rule tone={tone} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TeamPair pair={view.viewerTeam} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold" numberOfLines={1}>
              {view.teamName}
            </Text>
            <Text size="meta" tone="muted" numberOfLines={1}>
              {view.teamLine}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          <Text size="meta" weight="semibold">
            {view.roundsTitle}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {view.roundsMeta}
          </Text>
        </View>
        <RoundCells cells={view.cells} tone={tone} />
        {view.step && StepIcon ? (
          <>
            <Rule tone={tone} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{
                  width: STEP_TILE,
                  height: STEP_TILE,
                  borderRadius: radii.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tone.raised,
                  borderWidth: hairline,
                  borderColor: tone.rule,
                }}
              >
                <StepIcon size={ICON} color={colors.ink} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text weight="semibold">{view.step.title}</Text>
                <Text size="meta" tone="muted">
                  {view.step.body}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 16,
          minHeight: sizes.touchTarget,
        }}
      >
        <ActionButton
          label={view.secondary.label}
          primary={false}
          tone={tone}
          onPress={() => onOpen(view.secondary.target)}
        />
        <ActionButton
          label={view.primary.label}
          primary
          icon={view.scoring ? PenLine : undefined}
          tone={tone}
          onPress={() => onOpen(view.primary.target)}
        />
      </View>
    </Card>
  );
}

/** One played Groups only tournament: the place leads, one cell per Round. */
export function TournamentPlayedCard({
  row,
  onOpen,
}: {
  row: HubHistoryRow & { myTournament: MyTournament };
  onOpen: (target: TournamentCardTarget) => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const tone = useTone(false);
  const view = tournamentPlayedCardModel(row, locale);
  return (
    <Surface tone="paper" padded={false} style={{ overflow: "hidden" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          view.bandLabel,
          view.venueLine,
          view.place,
          view.summary,
        ]
          .filter(Boolean)
          .join(", ")}
        onPress={() => onOpen("tournament")}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexShrink: 1,
            }}
          >
            <Trophy size={ICON} color={colors.ink} />
            <Text weight="semibold" numberOfLines={1}>
              {view.bandLabel}
            </Text>
          </View>
          <Text size="meta" tone="muted">
            {view.day}
          </Text>
        </View>
        <Hairline />
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MapPin size={SMALL_ICON} color={colors.muted} />
            <Text
              size="meta"
              tone="muted"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {view.venueLine}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {view.place ? (
              <Text size="hero" width="expanded" weight="bold">
                {view.place}
              </Text>
            ) : null}
            <View
              style={{
                flex: 1,
                minWidth: 0,
                borderStartWidth: view.place ? hairline : 0,
                borderColor: colors.rule,
                paddingStart: view.place ? 16 : 0,
              }}
            >
              <Text weight="semibold">{view.context}</Text>
              <Text size="meta" tone="muted">
                {view.summary}
              </Text>
            </View>
          </View>
          <RoundCells cells={view.cells} tone={tone} />
        </View>
      </Pressable>
      {view.missing ? (
        <>
          <Hairline />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text
              size="meta"
              tone="muted"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {view.missing.line}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={view.missing.action.label}
              onPress={() => onOpen(view.missing!.action.target)}
              hitSlop={12}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Text size="meta" weight="semibold">
                {view.missing.action.label}
              </Text>
              <ArrowRight
                size={SMALL_ICON}
                color={colors.ink}
                style={mirrorInRtl}
              />
            </Pressable>
          </View>
        </>
      ) : null}
    </Surface>
  );
}
