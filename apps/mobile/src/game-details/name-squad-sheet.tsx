import { radii } from "@repo/design-tokens";
import { initials } from "@repo/domain/initials";
import {
  initialSquadSelection,
  squadProgressSegments,
  squadRosterOrder,
  squadRosterPreview,
  squadRosterRowMeta,
  squadSelectionIsFull,
  squadSheetCopy,
  toggleSquadSelection,
} from "@repo/domain/matchday-squad";
import { Check, X } from "lucide-react-native";
import { Fragment, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { HeaderIconButton } from "../primitives/screen-header";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { ChallengeInitials } from "./challenge-initials";

const CHECK_SIZE = 22;
const CHECK_RADIUS = 6;
const TILE_SIZE = 34;
const TILE_RADIUS = 9;
const ROW_HEIGHT = 56;
const SEGMENT_HEIGHT = 8;
const SEGMENT_GAP = 4;

function CheckMark({ selected }: { selected: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: CHECK_SIZE,
        height: CHECK_SIZE,
        borderRadius: CHECK_RADIUS,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.inputBorder,
        backgroundColor: selected ? colors.control : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? <Check size={14} color={colors.onControl} /> : null}
    </View>
  );
}

/** One bar segment per seat: solid once someone is named into it, hatched while open. */
function SquadProgress({
  selectedCount,
  sideSize,
  label,
}: {
  selectedCount: number;
  sideSize: number;
  label: string;
}) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ flexDirection: "row", gap: SEGMENT_GAP }}
    >
      {squadProgressSegments(selectedCount, sideSize).map((segment, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: SEGMENT_HEIGHT,
            borderRadius: SEGMENT_HEIGHT / 2,
            backgroundColor: segment.filled ? colors.control : "transparent",
          }}
        >
          {segment.filled ? null : <Hatch radius={SEGMENT_HEIGHT / 2} />}
        </View>
      ))}
    </View>
  );
}

/**
 * Name your squad (6b): the Team's Roster as a checklist, Captain first,
 * then whoever is named, then the rest, with role, Level and "Added by you,
 * not on Temba" per row, the seat bar over it, and "Confirm squad, N named".
 * Saving sends the whole list in naming order.
 */
export function NameSquadSheet({
  visible,
  onClose,
  gameId,
  teamId,
  sideSize,
  kickoff,
  namedUserIds,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  teamId: string;
  sideSize: number;
  kickoff: Date | string | null;
  namedUserIds: readonly string[];
  onSaved: () => Promise<unknown>;
}) {
  const m = useMessages();
  const sheetCopy = m.challenge.squad.sheet;
  const locale = useLocale();
  const colors = useColors();
  const toast = useToast();
  const team = api.teams.byId.useQuery({ id: teamId }, { enabled: visible });
  const members = team.data?.members ?? [];
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSeeded(false);
      setExpanded(false);
      return;
    }
    if (seeded || !team.data) {
      return;
    }
    const rosterIds = team.data.members.map((member) => member.userId);
    const initial = initialSquadSelection(
      namedUserIds,
      team.data.captainUserId,
      rosterIds,
    );
    setSelected(initial);
    setOrder(squadRosterOrder(rosterIds, team.data.captainUserId, initial));
    setSeeded(true);
  }, [visible, seeded, team.data, namedUserIds]);

  const save = api.games.nameChallengeSquad.useMutation({
    onSuccess: async () => {
      toast.show(m.challenge.squad.saved);
      await onSaved();
      onClose();
    },
  });

  const copy = squadSheetCopy(
    {
      sideSize,
      selectedCount: selected.length,
      rosterCount: members.length,
      kickoff,
    },
    locale,
  );
  const full = squadSelectionIsFull(selected, sideSize);
  const viewerIsCaptain = members.some(
    (member) => member.isViewer && member.isCreator,
  );
  const rows = [
    ...order.flatMap((userId) => {
      const member = members.find((candidate) => candidate.userId === userId);
      return member ? [member] : [];
    }),
    ...members.filter((member) => !order.includes(member.userId)),
  ];
  const preview = squadRosterPreview(rows, sideSize, selected.length, expanded);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.help}
      action={
        <HeaderIconButton
          framed
          icon={X}
          accessibilityLabel={sheetCopy.close}
          onPress={onClose}
        />
      }
      tall
      footer={
        <View style={{ gap: 10 }}>
          {save.error ? (
            <Text size="meta" weight="medium" accessibilityRole="alert">
              {save.error.message}
            </Text>
          ) : null}
          <Button
            label={copy.confirmLabel}
            size="lg"
            pending={save.isPending}
            disabled={!seeded}
            onPress={() => save.mutate({ gameId, teamId, userIds: selected })}
          />
        </View>
      }
    >
      <View style={{ gap: 6 }}>
        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            paddingBottom: 2,
          }}
        >
          <Text weight="semibold">{copy.namedLine}</Text>
          <Text size="eyebrow" tone="muted">
            {copy.rosterLine}
          </Text>
        </View>
        <SquadProgress
          selectedCount={selected.length}
          sideSize={sideSize}
          label={copy.counter}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="eyebrow" tone="muted">
            {copy.sideCounter}
          </Text>
          <Text size="eyebrow" tone="muted">
            {copy.reserveCounter}
          </Text>
        </View>
        {copy.stateLine ? <Text size="meta">{copy.stateLine}</Text> : null}
      </View>
      {team.error ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {sheetCopy.rosterLoadFailed}
        </Text>
      ) : !team.data ? (
        <Skeleton height={ROW_HEIGHT * 3} radius={radii.card} />
      ) : (
        <View
          style={{
            borderWidth: hairline,
            borderColor: colors.rule,
            borderRadius: radii.card,
            overflow: "hidden",
          }}
        >
          {preview.visible.map((member, index) => {
            const isSelected = selected.includes(member.userId);
            const blocked = full && !isSelected;
            const meta = squadRosterRowMeta(
              {
                userId: member.userId,
                name: member.name,
                role: member.footballRole,
                position: member.footballPosition,
                levelBand: member.levelBand,
                unclaimed: member.unclaimed,
                isViewer: member.isViewer,
                isCaptain: member.isCreator,
              },
              viewerIsCaptain,
              locale,
            );
            return (
              <Fragment key={member.userId}>
                {index > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={
                    isSelected
                      ? sheetCopy.deselect(member.name)
                      : sheetCopy.select(member.name)
                  }
                  accessibilityHint={meta || undefined}
                  accessibilityState={{
                    checked: isSelected,
                    disabled: blocked,
                  }}
                  disabled={blocked || save.isPending}
                  onPress={() =>
                    setSelected((current) =>
                      toggleSquadSelection(current, member.userId, sideSize),
                    )
                  }
                  style={({ pressed }) => ({
                    minHeight: ROW_HEIGHT,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 11,
                    paddingHorizontal: 16,
                    opacity: blocked ? 0.45 : pressed ? 0.6 : 1,
                  })}
                >
                  <CheckMark selected={isSelected} />
                  <ChallengeInitials
                    initials={initials(member.name)}
                    size={TILE_SIZE}
                    radius={TILE_RADIUS}
                    variant={member.isViewer ? "solid" : "outline"}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="semibold" numberOfLines={1}>
                      {member.name}
                    </Text>
                    {meta ? (
                      <Text size="eyebrow" tone="muted" numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              </Fragment>
            );
          })}
          {preview.hiddenCount > 0 ? (
            <>
              <Hairline />
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded(true)}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text size="eyebrow" tone="muted">
                  {sheetCopy.moreOnRoster(preview.hiddenCount)}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
      <Text size="eyebrow" tone="muted">
        {copy.footer}
      </Text>
    </Sheet>
  );
}
