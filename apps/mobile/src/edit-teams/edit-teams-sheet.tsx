import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  editTeamsMoves,
  editTeamsNotified,
  editTeamsNotifyCopy,
  editTeamsRefusalMessage,
  editTeamsSeats,
  editTeamsSides,
  editTeamsSpotLabel,
  editTeamsSummary,
  editTeamsSwapSides,
  editTeamsTap,
  sameSpot,
  type EditTeamsMove,
  type EditTeamsPlayer,
  type EditTeamsPosition,
  type EditTeamsRules,
  type EditTeamsSide,
  type EditTeamsSpot,
} from "@repo/domain/edit-teams";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { ArrowLeftRight, Lock } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";

type SourceSide = Parameters<typeof editTeamsSides>[0][number];
type SourceMatch = NonNullable<Parameters<typeof editTeamsSides>[1]>[number];

export type EditTeamsSheetProps = {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  format: "friendly_game" | "friendly_tournament";
  sides: readonly SourceSide[];
  matches: readonly SourceMatch[];
  rules: EditTeamsRules;
  viewerUserId: string;
  onSaved: () => Promise<unknown>;
};

const POSITIONS: readonly EditTeamsPosition[] = ["left", "right"];

function SeatTile({
  player,
  spot,
  format,
  isViewer,
  selected,
  moved,
  picking,
  onPress,
}: {
  player: EditTeamsPlayer | null;
  spot: EditTeamsSpot;
  format: EditTeamsSheetProps["format"];
  isViewer: boolean;
  selected: boolean;
  moved: boolean;
  picking: boolean;
  onPress: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const copy = m.editTeams;
  const spotLabel = editTeamsSpotLabel(format, spot, locale);
  const positionName =
    spot.position === "left" ? m.game.sides.left : m.game.sides.right;

  if (!player) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.openSr(spotLabel)}
        accessibilityHint={picking ? copy.dropHint : undefined}
        accessibilityState={{ disabled: !picking }}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: sizes.touchTarget + 40,
          borderRadius: radii.slot,
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          opacity: pressed && picking ? 0.6 : 1,
          borderWidth: picking ? hairline : 0,
          borderColor: colors.ink,
        })}
      >
        <Hatch radius={radii.slot} />
        <Text size="eyebrow" tone="muted">
          {positionName}
        </Text>
        <Text size="meta" tone={picking ? "default" : "muted"} weight="medium">
          {picking ? copy.moveHere : copy.open}
        </Text>
      </Pressable>
    );
  }

  const name = isViewer ? m.common.you : player.name;
  const level = player.levelBand
    ? displayLabelFromStoredBand(player.levelBand)
    : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.playerSr(name, spotLabel)}
      accessibilityHint={
        selected ? copy.cancelHint : picking ? copy.dropHint : copy.pickHint
      }
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        minHeight: sizes.touchTarget + 40,
        padding: 10,
        borderRadius: radii.slot,
        alignItems: "center",
        gap: 4,
        borderWidth: selected ? 2 : hairline,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: selected ? colors.wash : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text size="eyebrow" tone="muted">
        {positionName}
      </Text>
      <Avatar name={player.name} uri={player.image} size="sm" />
      <Text size="meta" weight="medium" numberOfLines={1}>
        {name}
      </Text>
      <Text size="eyebrow" tone="muted" numberOfLines={1}>
        {moved ? copy.moved : (level ?? " ")}
      </Text>
    </Pressable>
  );
}

function TeamBlock({
  side,
  format,
  viewerUserId,
  original,
  selected,
  onTap,
  onSwap,
}: {
  side: EditTeamsSide;
  format: EditTeamsSheetProps["format"];
  viewerUserId: string;
  original: readonly EditTeamsSide[];
  selected: EditTeamsSpot | null;
  onTap: (spot: EditTeamsSpot) => void;
  onSwap: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const teamLabel = formatGameSideLabel(format, side.sideIndex, locale);
  const before = original.find((row) => row.sideIndex === side.sideIndex);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text size="meta" weight="semibold" style={{ flex: 1 }}>
          {teamLabel}
        </Text>
        {side.locked ? (
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            accessible
            accessibilityLabel={m.editTeams.lockedTag}
          >
            <Lock size={12} color={colors.muted} />
            <Text size="eyebrow" tone="muted">
              {m.editTeams.lockedTag}
            </Text>
          </View>
        ) : null}
        {side.left || side.right ? (
          <Button
            label={m.editTeams.swapSides}
            accessibilityLabel={m.editTeams.swapSidesOf(teamLabel)}
            size="sm"
            variant="outline"
            icon={<ArrowLeftRight size={14} color={colors.ink} />}
            onPress={onSwap}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {POSITIONS.map((position) => {
          const spot = { sideIndex: side.sideIndex, position };
          const player = side[position];
          return (
            <SeatTile
              key={position}
              player={player}
              spot={spot}
              format={format}
              isViewer={player?.userId === viewerUserId}
              selected={sameSpot(selected, spot)}
              moved={
                player != null && before?.[position]?.userId !== player.userId
              }
              picking={selected != null && !sameSpot(selected, spot)}
              onPress={() => onTap(spot)}
            />
          );
        })}
      </View>
    </View>
  );
}

function MoveRow({
  move,
  format,
  viewerUserId,
}: {
  move: EditTeamsMove;
  format: EditTeamsSheetProps["format"];
  viewerUserId: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const from = editTeamsSpotLabel(format, move.from, locale);
  const to = editTeamsSpotLabel(format, move.to, locale);
  const name =
    move.player.userId === viewerUserId ? m.common.you : move.player.name;
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${m.editTeams.movedLine(from, to)}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <Avatar name={move.player.name} uri={move.player.image} size="sm" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="medium" numberOfLines={1}>
          {name}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={2}>
          {m.editTeams.movedLine(from, to)}
        </Text>
      </View>
    </View>
  );
}

/**
 * The Organizer's Edit teams board: tap a player, then tap another player
 * to swap or an open spot to move there. Nothing changes until Save, which
 * lists every move and who gets told.
 */
export function EditTeamsSheet({
  visible,
  onClose,
  gameId,
  format,
  sides,
  matches,
  rules,
  viewerUserId,
  onSaved,
}: EditTeamsSheetProps) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const toast = useToast();
  const copy = m.editTeams;
  const original = useMemo(
    () => editTeamsSides(sides, matches),
    [sides, matches],
  );
  const [board, setBoard] = useState<EditTeamsSide[]>(original);
  const [selected, setSelected] = useState<EditTeamsSpot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notify, setNotify] = useState(true);

  const save = api.games.editTeams.useMutation({
    onSuccess: async () => {
      toast.show(copy.savedToast);
      await onSaved();
      onClose();
    },
  });

  useEffect(() => {
    if (visible) {
      setBoard(original);
      setSelected(null);
      setNotice(null);
      setConfirming(false);
      setNotify(true);
      save.reset();
    }
    // Reset only when the sheet opens, not on every refetch while editing.
  }, [visible]);

  const moves = editTeamsMoves(original, board);
  const notified = editTeamsNotified(moves, viewerUserId);
  const hasLocked = board.some((side) => side.locked);
  const isGame = format === "friendly_game";

  function tap(spot: EditTeamsSpot) {
    const result = editTeamsTap(board, selected, spot, rules);
    setBoard(result.sides);
    setSelected(result.selected);
    setNotice(
      result.refused ? editTeamsRefusalMessage(result.refused, locale) : null,
    );
  }

  function swap(sideIndex: number) {
    setBoard((current) => editTeamsSwapSides(current, sideIndex));
    setSelected(null);
    setNotice(null);
  }

  function reset() {
    setBoard(original);
    setSelected(null);
    setNotice(null);
  }

  const boardFooter = (
    <View style={{ gap: 10 }}>
      {notice ? (
        <Text
          size="meta"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {notice}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="meta" weight="semibold">
            {moves.length === 0
              ? copy.noChangesTitle
              : copy.changesTitle(moves.length)}
          </Text>
          <Text size="eyebrow" tone="muted">
            {moves.length === 0
              ? isGame
                ? copy.noChangesGame
                : copy.noChangesTournament
              : copy.changesSubline}
          </Text>
        </View>
        <Button
          label={copy.save}
          disabled={moves.length === 0}
          onPress={() => {
            save.reset();
            setSelected(null);
            setConfirming(true);
          }}
        />
      </View>
    </View>
  );

  const confirmFooter = (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Button
        label={copy.keepEditing}
        variant="outline"
        disabled={save.isPending}
        onPress={() => setConfirming(false)}
      />
      <Button
        label={copy.saveTeams}
        pending={save.isPending}
        onPress={() =>
          save.mutate({
            gameId,
            seats: editTeamsSeats(board),
            notifyPlayers: notify,
          })
        }
      />
    </View>
  );

  const teamBlock = (side: EditTeamsSide) => (
    <TeamBlock
      key={side.sideIndex}
      side={side}
      format={format}
      viewerUserId={viewerUserId}
      original={original}
      selected={selected}
      onTap={tap}
      onSwap={() => swap(side.sideIndex)}
    />
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={confirming ? copy.confirmTitle : copy.title}
      subtitle={
        confirming
          ? editTeamsSummary(moves, locale)
          : isGame
            ? copy.gameInstructions
            : copy.tournamentInstructions
      }
      closeButton
      tall
      footer={confirming ? confirmFooter : boardFooter}
    >
      {confirming ? (
        <>
          <View style={{ gap: 12 }}>
            {moves.map((move) => (
              <MoveRow
                key={move.player.userId}
                move={move}
                format={format}
                viewerUserId={viewerUserId}
              />
            ))}
          </View>
          <Hairline />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="meta" weight="semibold">
                {copy.notifyTitle}
              </Text>
              <Text size="eyebrow" tone="muted">
                {editTeamsNotifyCopy(moves, viewerUserId, locale)}
              </Text>
            </View>
            <Switch
              accessibilityLabel={copy.notifyTitle}
              value={notify && notified.length > 0}
              disabled={notified.length === 0 || save.isPending}
              onValueChange={setNotify}
              trackColor={{ false: colors.rule, true: colors.ink }}
              thumbColor={notify ? colors.paper : colors.onControl}
              ios_backgroundColor={colors.rule}
            />
          </View>
          {save.error ? (
            <Text
              size="meta"
              accessibilityRole="alert"
              style={{ color: colors.danger }}
            >
              {save.error.message}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {hasLocked ? (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                padding: spacing.surface,
                borderRadius: radii.slot,
                borderWidth: hairline,
                borderColor: colors.rule,
              }}
            >
              <Lock size={16} color={colors.ink} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text size="meta" weight="semibold">
                  {copy.lockedTitle}
                </Text>
                <Text size="eyebrow" tone="muted">
                  {copy.lockedCopy}
                </Text>
              </View>
            </View>
          ) : null}
          {isGame && board.length === 2 ? (
            <View style={{ gap: 12 }}>
              {teamBlock(board[0]!)}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={{ flex: 1 }}>
                  <Hairline />
                </View>
                <Text size="eyebrow" tone="muted">
                  {copy.net}
                </Text>
                <View style={{ flex: 1 }}>
                  <Hairline />
                </View>
              </View>
              {teamBlock(board[1]!)}
            </View>
          ) : (
            <View style={{ gap: 20 }}>{board.map(teamBlock)}</View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
              {isGame ? copy.untilScore : copy.roundsKeepSlots}
            </Text>
            {moves.length > 0 ? (
              <Button
                label={copy.reset}
                size="sm"
                variant="outline"
                onPress={reset}
              />
            ) : null}
          </View>
        </>
      )}
    </Sheet>
  );
}
