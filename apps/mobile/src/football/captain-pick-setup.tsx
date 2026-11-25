import { radii } from "@repo/design-tokens";
import {
  lineupPlayerName,
  mayBeSideCaptain,
  ovrLabel,
  setPickCaptain,
  slotCode,
  type BoardPlayer,
  type Side,
  type TeamsDraft,
} from "@repo/domain/football-board";
import {
  captainPickPoolLine,
  captainPickPoolOrder,
} from "@repo/domain/football-captain-pick";
import {
  FOOTBALL_FIRST_PICKS,
  type FootballBalanceOn,
  type FootballFirstPick,
} from "@repo/domain/football-lineup";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { BibPicker } from "./bib-picker";
import { CaptainsSheet } from "./captains-sheet";

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="meta" tone="muted">
        {title}
      </Text>
      {meta ? (
        <Text size="eyebrow" tone="muted">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

function PickCaptainChip({
  side,
  team,
  captain,
  onPress,
}: {
  side: Side;
  team: string;
  captain: BoardPlayer | null;
  onPress: (side: Side) => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick.setup;
  const name = lineupPlayerName(captain, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.chipSpoken(team, name)}
      onPress={() => onPress(side)}
      style={{
        flex: 1,
        minWidth: 0,
        height: 42,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderStyle: captain ? "solid" : "dashed",
        borderColor: captain ? colors.rule : colors.inputBorder,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: radii.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: captain ? colors.control : colors.paper,
          borderWidth: hairline,
          borderColor: captain ? colors.controlEdge : colors.inputBorder,
        }}
      >
        <Text
          size="eyebrow"
          weight="semibold"
          style={{ color: captain ? colors.onControl : colors.muted }}
        >
          {messages.football.captains.badge}
        </Text>
      </View>
      <Text
        size="meta"
        numberOfLines={1}
        tone={captain ? undefined : "muted"}
        style={{ flex: 1 }}
      >
        {name ? m.captainChip(name, team) : m.addCaptain(team)}
      </Text>
      <ChevronDown size={14} color={colors.muted} />
    </Pressable>
  );
}

function FirstPickToggle({
  value,
  names,
  onChange,
}: {
  value: FootballFirstPick;
  names: { slot1: string; slot2: string };
  onChange: (value: FootballFirstPick) => void;
}) {
  const colors = useColors();
  const m = useMessages().football.pick.setup;
  const labels: Record<FootballFirstPick, string> = {
    toss: m.toss,
    slot1: names.slot1,
    slot2: names.slot2,
  };
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={m.firstPickTitle}
      style={{
        flexDirection: "row",
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
      }}
    >
      {FOOTBALL_FIRST_PICKS.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option)}
            style={{
              flex: 1,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? colors.control : colors.paper,
            }}
          >
            <Text
              size="meta"
              weight={selected ? "semibold" : "regular"}
              style={{ color: selected ? colors.onControl : colors.muted }}
            >
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PoolTile({ player }: { player: BoardPlayer }) {
  const colors = useColors();
  const locale = useLocale();
  const meta = [slotCode(player, locale), ovrLabel(player)]
    .filter(Boolean)
    .join(" ");
  return (
    <View
      style={{
        width: "48.5%",
        height: 40,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: colors.rule,
      }}
    >
      <Text size="meta" numberOfLines={1} style={{ flex: 1 }}>
        {lineupPlayerName(player, locale)}
      </Text>
      <Text size="eyebrow" mono tone="muted">
        {meta}
      </Text>
    </View>
  );
}

/**
 * Captain pick on Make teams (design 4a, ADR-0109): a Side captain for each
 * side from the whole roster, who picks first, the bibs, and everyone else
 * still to be picked, best level first.
 */
export function CaptainPickSetup({
  draft,
  players,
  names,
  balanceOn,
  firstPick,
  onChange,
  onFirstPickChange,
}: {
  draft: TeamsDraft;
  players: readonly BoardPlayer[];
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  firstPick: FootballFirstPick;
  onChange: (draft: TeamsDraft) => void;
  onFirstPickChange: (firstPick: FootballFirstPick) => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick.setup;
  const [captainsSide, setCaptainsSide] = useState<Side | null>(null);
  const captain = (userId: string | null) =>
    players.find((player) => player.userId === userId) ?? null;
  const eligible = players.filter(mayBeSideCaptain);
  const pool = captainPickPoolOrder(
    players.filter((player) => !draft.sides[player.userId]),
    { organizer: true, balanceOn },
  );
  return (
    <>
      <View style={{ gap: 10 }}>
        <SectionHead title={m.captainsTitle} meta={m.captainsHint} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PickCaptainChip
            side={1}
            team={names.slot1}
            captain={captain(draft.captains.slot1)}
            onPress={setCaptainsSide}
          />
          <PickCaptainChip
            side={2}
            team={names.slot2}
            captain={captain(draft.captains.slot2)}
            onPress={setCaptainsSide}
          />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <SectionHead title={m.firstPickTitle} />
        <FirstPickToggle
          value={firstPick}
          names={names}
          onChange={onFirstPickChange}
        />
        <Text size="eyebrow" tone="muted">
          {firstPick === "toss" ? m.tossNote : m.sideNote(names[firstPick])}
        </Text>
      </View>
      <BibPicker
        bibs={draft.bibs}
        onChange={(bibs) => onChange({ ...draft, bibs })}
      />
      <View style={{ gap: 10 }}>
        <SectionHead
          title={m.toBePicked}
          meta={captainPickPoolLine(pool.length, locale)}
        />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: 6,
          }}
        >
          {pool.map((player) => (
            <PoolTile key={player.userId} player={player} />
          ))}
        </View>
      </View>
      <CaptainsSheet
        side={captainsSide}
        bibs={draft.bibs}
        names={names}
        sides={{ slot1: eligible, slot2: eligible }}
        captains={draft.captains}
        subtitle={m.sheetBody}
        emptyNote={m.noneOnRoster}
        required
        onSideChange={setCaptainsSide}
        onPick={(side, userId) => onChange(setPickCaptain(draft, side, userId))}
        onClose={() => setCaptainsSide(null)}
      />
    </>
  );
}
