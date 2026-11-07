import { radii, sizes } from "@repo/design-tokens";
import type { GameMarks, MarkKind } from "@repo/domain/marks";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { MarkCoin } from "./mark-coin";
import {
  givePlayersModel,
  markPickModel,
  type GivePlayerRow,
  type MarkPickModel,
} from "./marks-model";
import type { GameMarksController } from "./use-game-marks";

const ROW_MIN_HEIGHT = 56;
const TILE_WIDTH = "31%";

function GroupHead({
  title,
  caption,
}: {
  title: string;
  caption: string | null;
}) {
  return (
    <View style={{ gap: 2, paddingTop: 4 }}>
      <Text size="meta" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      {caption ? (
        <Text size="eyebrow" tone="muted">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function PlayerRow({
  row,
  first,
  pending,
  onPick,
  onRetract,
}: {
  row: GivePlayerRow;
  first: boolean;
  pending: boolean;
  onPick: () => void;
  onRetract: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[row.name, row.sub, row.givenName]
        .filter(Boolean)
        .join(m.common.listSeparator)}
      accessibilityState={{ disabled: !row.canPick }}
      disabled={!row.canPick}
      onPress={onPick}
      style={({ pressed }) => ({
        minHeight: ROW_MIN_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderTopWidth: first ? 0 : hairline,
        borderColor: colors.rule,
        backgroundColor: pressed ? colors.wash : colors.sheet,
      })}
    >
      <Avatar name={row.name} uri={row.image} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        {row.givenName ? (
          <Text size="eyebrow" numberOfLines={1}>
            {row.givenName}
          </Text>
        ) : row.sub ? (
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {row.sub}
          </Text>
        ) : null}
      </View>
      {row.given ? (
        <>
          <MarkCoin kind={row.given} size="row" />
          <Button
            label={m.marks.give.retract}
            accessibilityLabel={row.retractSpoken ?? undefined}
            variant="outline"
            size="sm"
            disabled={pending}
            onPress={onRetract}
          />
        </>
      ) : null}
    </Pressable>
  );
}

function PlayersStep({
  data,
  pending,
  onPick,
  onRetract,
}: {
  data: GameMarks;
  pending: boolean;
  onPick: (userId: string) => void;
  onRetract: (userId: string) => void;
}) {
  const locale = useLocale();
  const colors = useColors();
  const model = givePlayersModel(data, locale);
  return (
    <>
      {model.groups.map((group) => (
        <View key={group.relation} style={{ gap: 8 }}>
          <GroupHead title={group.title} caption={group.caption} />
          <View
            style={{
              borderWidth: hairline,
              borderColor: colors.rule,
              borderRadius: radii.card,
              overflow: "hidden",
            }}
          >
            {group.rows.map((row, index) => (
              <PlayerRow
                key={row.userId}
                row={row}
                first={index === 0}
                pending={pending}
                onPick={() => onPick(row.userId)}
                onRetract={() => onRetract(row.userId)}
              />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function KindTile({
  name,
  kind,
  selected,
  onPress,
}: {
  name: string;
  kind: MarkKind;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: TILE_WIDTH,
        minHeight: sizes.touchTarget,
        alignItems: "center",
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: selected || pressed ? colors.wash : colors.sheet,
      })}
    >
      <MarkCoin kind={kind} size="cabinet" />
      <Text
        size="eyebrow"
        weight={selected ? "semibold" : "regular"}
        numberOfLines={2}
        style={{ textAlign: "center" }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

function MarksStep({
  model,
  picked,
  onPick,
}: {
  model: MarkPickModel;
  picked: MarkKind | null;
  onPick: (kind: MarkKind) => void;
}) {
  return (
    <>
      {model.groups.map((group) => (
        <View key={group.key} style={{ gap: 8 }}>
          <GroupHead title={group.title} caption={group.caption} />
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
          >
            {group.kinds.map((choice) => (
              <KindTile
                key={choice.kind}
                kind={choice.kind}
                name={choice.name}
                selected={picked === choice.kind}
                onPress={() => onPick(choice.kind)}
              />
            ))}
          </View>
        </View>
      ))}
      {model.footnote ? (
        <Text size="eyebrow" tone="muted">
          {model.footnote}
        </Text>
      ) : null}
    </>
  );
}

/**
 * Give marks: pick a player (2b), then pick the mark (2c). Only the kinds
 * the server would accept are offered; a refused give still shows its
 * reason and refreshes.
 */
export function GiveMarksSheet({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const m = useMessages();
  const visible = marks.sheet?.kind === "give";
  const [receiver, setReceiver] = useState<string | null>(null);
  const [picked, setPicked] = useState<MarkKind | null>(null);

  useEffect(() => {
    if (!visible) {
      setReceiver(null);
      setPicked(null);
    }
  }, [visible]);

  const data = marks.data;
  const pickModel =
    data && receiver ? markPickModel(data, receiver, picked, locale) : null;
  const players = data ? givePlayersModel(data, locale) : null;

  const backToPlayers = () => {
    setReceiver(null);
    setPicked(null);
  };

  const give = async () => {
    if (!data || !receiver || !pickModel?.picked || !picked) {
      return;
    }
    const lastOne = data.viewer.remaining <= 1;
    if (await marks.give(receiver, picked)) {
      if (lastOne) {
        marks.closeSheet();
      } else {
        backToPlayers();
      }
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={marks.closeSheet}
      tall
      title={pickModel?.title ?? players?.title}
      subtitle={pickModel?.subtitle ?? players?.subtitle}
      action={
        pickModel ? (
          <Button
            label={m.common.back}
            variant="outline"
            size="sm"
            onPress={backToPlayers}
          />
        ) : undefined
      }
      closeButton={!pickModel}
      footer={
        pickModel ? (
          <View style={{ gap: 10 }}>
            {pickModel.picked ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {picked ? <MarkCoin kind={picked} size="row" /> : null}
                <Text
                  size="meta"
                  weight="semibold"
                  numberOfLines={1}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {pickModel.picked.line}
                </Text>
                <Text size="eyebrow" tone="muted">
                  {pickModel.picked.remaining}
                </Text>
              </View>
            ) : null}
            <Button
              label={pickModel.picked?.cta ?? pickModel.choose}
              size="lg"
              disabled={!pickModel.picked}
              pending={marks.pending}
              onPress={() => void give()}
            />
          </View>
        ) : undefined
      }
    >
      {data && pickModel ? (
        <MarksStep model={pickModel} picked={picked} onPick={setPicked} />
      ) : data ? (
        <PlayersStep
          data={data}
          pending={marks.pending}
          onPick={(userId) => {
            setReceiver(userId);
            setPicked(null);
          }}
          onRetract={(userId) => void marks.retract(userId)}
        />
      ) : null}
    </Sheet>
  );
}
