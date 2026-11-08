import { radii } from "@repo/design-tokens";
import {
  initialSquadSelection,
  squadPlayerMeta,
  squadSelectionIsFull,
  squadSheetCopy,
  toggleSquadSelection,
} from "@repo/domain/matchday-squad";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";

const MARK_SIZE = 24;
const ROW_HEIGHT = 62;

function PickMark({ selected }: { selected: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: MARK_SIZE,
        height: MARK_SIZE,
        borderRadius: MARK_SIZE / 2,
        borderWidth: 1.5,
        borderColor: selected ? colors.ink : colors.inputBorder,
        backgroundColor: selected ? colors.ink : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? <Check size={14} color={colors.paper} /> : null}
    </View>
  );
}

/**
 * Name your squad (6b): the Team's Roster to pick from, Captain first when
 * nobody is named yet, with role, Level and "Not on Temba yet" per row.
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
  const locale = useLocale();
  const colors = useColors();
  const toast = useToast();
  const team = api.teams.byId.useQuery({ id: teamId }, { enabled: visible });
  const members = team.data?.members ?? [];
  const [selected, setSelected] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSeeded(false);
      return;
    }
    if (seeded || !team.data) {
      return;
    }
    setSelected(
      initialSquadSelection(
        namedUserIds,
        team.data.captainUserId,
        team.data.members.map((member) => member.userId),
      ),
    );
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

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.help}
      closeButton
      tall
      footer={
        <View style={{ gap: 10 }}>
          <Text size="meta" tone="muted">
            {copy.footer}
          </Text>
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
        <Text weight="semibold" accessibilityLiveRegion="polite">
          {copy.counter}
        </Text>
        <Text size="meta" tone="muted">
          {[copy.sideCounter, copy.reserveCounter].join(m.group.metaSeparator)}
        </Text>
        {copy.stateLine ? <Text size="meta">{copy.stateLine}</Text> : null}
      </View>
      {team.error ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {m.challenge.squad.sheet.rosterLoadFailed}
        </Text>
      ) : !team.data ? (
        <Skeleton height={ROW_HEIGHT * 3} radius={radii.md} />
      ) : (
        <View>
          {members.map((member) => {
            const isSelected = selected.includes(member.userId);
            const blocked = full && !isSelected;
            const meta = [
              member.isCreator ? m.challenge.squad.sheet.captain : null,
              squadPlayerMeta(
                {
                  userId: member.userId,
                  name: member.name,
                  role: member.footballRole,
                  position: member.footballPosition,
                  levelBand: member.levelBand,
                },
                locale,
              ) || null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Pressable
                key={member.userId}
                accessibilityRole="checkbox"
                accessibilityLabel={
                  isSelected
                    ? m.challenge.squad.sheet.deselect(member.name)
                    : m.challenge.squad.sheet.select(member.name)
                }
                accessibilityHint={meta || undefined}
                accessibilityState={{ checked: isSelected, disabled: blocked }}
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
                  paddingVertical: 10,
                  borderBottomWidth: hairline,
                  borderColor: colors.rule,
                  opacity: blocked ? 0.45 : pressed ? 0.6 : 1,
                })}
              >
                <Avatar
                  name={member.name}
                  uri={member.image}
                  size="lg"
                  radius={radii.md}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text weight="semibold" numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.unclaimed ? <NotOnTembaMark /> : null}
                  {meta ? (
                    <Text size="eyebrow" tone="muted" numberOfLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                </View>
                <PickMark selected={isSelected} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}
