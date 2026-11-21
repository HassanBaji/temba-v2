import { radii, sizes } from "@repo/design-tokens";
import {
  mayBeSideCaptain,
  slotCode,
  ovrLabel,
  type Bibs,
  type BoardPlayer,
  type Side,
  type SideCaptains,
} from "@repo/domain/football-board";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { NicknameName } from "../primitives/nickname-name";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { BibChip } from "./bib-picker";

const ROW_HEIGHT = 50;
const RADIO = 20;

function Radio({ selected }: { selected: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: RADIO,
        height: RADIO,
        borderRadius: RADIO / 2,
        borderWidth: hairline,
        borderColor: selected ? colors.ink : colors.inputBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? (
        <View
          style={{
            width: RADIO / 2,
            height: RADIO / 2,
            borderRadius: RADIO / 4,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
    </View>
  );
}

function TeamSwitch({
  side,
  bibs,
  names,
  onChange,
}: {
  side: Side;
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  onChange: (side: Side) => void;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: "row",
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
      }}
    >
      {([1, 2] as const).map((value) => {
        const selected = value === side;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(value)}
            style={{
              flex: 1,
              height: 42,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: selected ? colors.control : colors.paper,
            }}
          >
            <BibChip bib={value === 1 ? bibs.slot1 : bibs.slot2} />
            <Text
              size="meta"
              weight={selected ? "semibold" : "regular"}
              style={{ color: selected ? colors.onControl : colors.muted }}
            >
              {value === 1 ? names.slot1 : names.slot2}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The Organizer names each team's Side captain from that team's players, or
 * none (design 1b, ADR-0108). Guest players and Unclaimed players are not
 * offered: they cannot open the draft. A Captain pick offers the whole
 * roster to each side and needs both, so it has no "No captain" row.
 */
export function CaptainsSheet({
  side,
  bibs,
  names,
  sides,
  captains,
  subtitle,
  emptyNote,
  required = false,
  onSideChange,
  onPick,
  onClose,
}: {
  side: Side | null;
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  sides: { slot1: readonly BoardPlayer[]; slot2: readonly BoardPlayer[] };
  captains: SideCaptains;
  subtitle?: string;
  emptyNote?: string;
  required?: boolean;
  onSideChange: (side: Side) => void;
  onPick: (side: Side, userId: string | null) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.captains;
  const current = side ?? 1;
  const team = current === 1 ? names.slot1 : names.slot2;
  const captain = current === 1 ? captains.slot1 : captains.slot2;
  const players = (current === 1 ? sides.slot1 : sides.slot2).filter(
    mayBeSideCaptain,
  );
  const row = (
    key: string,
    selected: boolean,
    onPress: () => void,
    label: string,
    content: React.ReactNode,
    first: boolean,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        minHeight: Math.max(ROW_HEIGHT, sizes.touchTarget),
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderTopWidth: first ? 0 : hairline,
        borderTopColor: colors.rule,
        backgroundColor: selected ? colors.wash : colors.paper,
      }}
    >
      {content}
      <Radio selected={selected} />
    </Pressable>
  );

  return (
    <Sheet
      visible={side != null}
      onClose={onClose}
      title={m.title}
      subtitle={subtitle ?? m.sheetBody}
      closeButton
      tall
      footer={<Button label={m.done} size="lg" onPress={onClose} />}
    >
      <TeamSwitch
        side={current}
        bibs={bibs}
        names={names}
        onChange={onSideChange}
      />
      <View
        accessibilityRole="radiogroup"
        style={{
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: colors.rule,
          overflow: "hidden",
        }}
      >
        {players.map((player, index) => {
          const name = player.isViewer
            ? messages.common.you
            : (player.nickname?.name ?? player.name);
          const meta = [slotCode(player, locale), ovrLabel(player)]
            .filter(Boolean)
            .join(" ");
          return row(
            player.userId,
            captain === player.userId,
            () => onPick(current, player.userId),
            name,
            <>
              <Avatar name={player.name} uri={player.image} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <NicknameName
                  name={name}
                  isNickname={!player.isViewer && player.nickname != null}
                  weight="regular"
                />
              </View>
              <Text size="eyebrow" mono tone="muted">
                {meta}
              </Text>
            </>,
            index === 0,
          );
        })}
        {required
          ? null
          : row(
              "none",
              captain == null,
              () => onPick(current, null),
              m.noCaptainFor(team),
              <>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: hairline,
                    borderStyle: "dashed",
                    borderColor: colors.inputBorder,
                  }}
                />
                <Text tone="muted" style={{ flex: 1 }}>
                  {m.noCaptainFor(team)}
                </Text>
              </>,
              players.length === 0,
            )}
      </View>
      {players.length === 0 ? (
        <Text size="meta" tone="muted">
          {emptyNote ?? m.noneOnTeam}
        </Text>
      ) : null}
    </Sheet>
  );
}
