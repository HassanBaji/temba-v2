import { colors, radii, sizes } from "@repo/design-tokens";
import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
import {
  groupMemberOrganizerActionHint,
  groupMemberOrganizerActionLabel,
  type GroupMemberOrganizerAction,
} from "@repo/domain/group-home-chrome";
import {
  groupMembersLegend,
  groupPendingInvitesTitle,
} from "@repo/domain/group-members-table";
import {
  ChevronRight,
  EllipsisVertical,
  UserRoundPlus,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { SearchField } from "../primitives/search-field";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  memberIsRemovable,
  memberList,
  memberOrganizerAction,
  memberSheetView,
  type MemberRowView,
} from "./group-home-model";
import { LevelCell } from "./level-cell";
import { MemberSheet } from "./member-sheet";
import { Notice } from "./notice";

const LEVEL_WIDTH = 52;
const ACTION_WIDTH = 44;
const ROW_PADDING_START = 16;
const ROW_PADDING_END = 10;

function YouMark() {
  const m = useMessages();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: colors.ink,
        borderRadius: radii.slot - 1,
        paddingHorizontal: 4,
      }}
    >
      <Text size="eyebrow" mono>
        {m.mobileGroup.members.youMark}
      </Text>
    </View>
  );
}

function MemberRow({
  row,
  showLevel,
  managing,
  onOpen,
  onManage,
}: {
  row: MemberRowView;
  showLevel: boolean;
  managing: boolean;
  onOpen?: () => void;
  onManage?: () => void;
}) {
  const m = useMessages();
  const content = (
    <>
      <Avatar name={row.name} uri={row.imageUri} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {row.name}
          </Text>
          {row.isViewer ? <YouMark /> : null}
        </View>
        {row.unclaimed ? <NotOnTembaMark /> : null}
        {row.caption ? (
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {row.caption}
          </Text>
        ) : null}
      </View>
      {showLevel ? (
        <View style={{ width: LEVEL_WIDTH, alignItems: "center" }}>
          <LevelCell view={row.level} />
        </View>
      ) : null}
    </>
  );
  const style = {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingStart: ROW_PADDING_START,
    paddingEnd: managing ? 0 : ROW_PADDING_END,
    paddingVertical: 8,
  } as const;

  if (managing) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          accessible
          accessibilityLabel={row.accessibilityLabel}
          style={{ ...style, flex: 1 }}
        >
          {content}
        </View>
        {onManage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.mobileGroup.members.manageName(row.name)}
            onPress={onManage}
            style={({ pressed }) => ({
              width: ACTION_WIDTH,
              height: sizes.touchTarget,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <EllipsisVertical size={sizes.iconAction} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={{ width: ACTION_WIDTH }} />
        )}
      </View>
    );
  }

  if (onOpen) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.accessibilityLabel}
        accessibilityHint={m.mobileGroup.opensPlayerProfile}
        onPress={onOpen}
        style={({ pressed }) => ({ ...style, opacity: pressed ? 0.6 : 1 })}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible accessibilityLabel={row.accessibilityLabel} style={style}>
      {content}
    </View>
  );
}

function TableHeader({
  managing,
  showLevel,
}: {
  managing: boolean;
  showLevel: boolean;
}) {
  const m = useMessages();
  return (
    <View
      style={{
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingStart: ROW_PADDING_START,
        paddingEnd: managing ? 0 : ROW_PADDING_END,
        backgroundColor: colors.wash,
      }}
    >
      <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
        {m.mobileGroup.members.columnMember}
      </Text>
      {showLevel ? (
        <Text
          size="eyebrow"
          tone="muted"
          mono
          accessibilityLabel={m.common.level}
          style={{ width: LEVEL_WIDTH, textAlign: "center" }}
        >
          {m.mobileGroup.members.columnLevel}
        </Text>
      ) : null}
      {managing ? <View style={{ width: ACTION_WIDTH }} /> : null}
    </View>
  );
}

function PendingInvitesCard({
  names,
  onOpen,
}: {
  names: string[];
  onOpen: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const title = groupPendingInvitesTitle(names.length, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.mobileGroup.members.pendingInvites(
        title,
        names.join(", "),
      )}
      onPress={onOpen}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Hatch bordered={false} radius={radii.card} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{title}</Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {names.join(", ")}
        </Text>
      </View>
      <ChevronRight
        size={sizes.iconRow + 2}
        color={colors.dim}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}

export function MembersTab({
  leaderboard,
  query,
  onQueryChange,
  apiOrigin,
  canSetLevel,
  showLevel = true,
  onSetLevel,
  onOpenMember,
  canAddPlayers = false,
  onRenameUnclaimed,
  canRemovePlayers = false,
  onRemovePlayer,
  canAppointOrganizers = false,
  onOrganizerAction,
  pendingInviteNames = [],
  onOpenInvites,
  onAddPlayer,
  top,
  afterTable,
}: {
  leaderboard: GroupLeaderboardEntryData[];
  query: string;
  onQueryChange: (query: string) => void;
  apiOrigin: string;
  canSetLevel: boolean;
  showLevel?: boolean;
  onSetLevel: (userId: string) => void;
  onOpenMember?: (userId: string) => void;
  canAddPlayers?: boolean;
  onRenameUnclaimed?: (member: { userId: string; name: string }) => void;
  canRemovePlayers?: boolean;
  onRemovePlayer?: (member: { userId: string; name: string }) => void;
  canAppointOrganizers?: boolean;
  onOrganizerAction?: (
    member: { userId: string; name: string },
    action: GroupMemberOrganizerAction,
  ) => void;
  /** Lookup invites not yet accepted; only an inviter is given them. */
  pendingInviteNames?: string[];
  onOpenInvites?: () => void;
  /** Shown only while managing. */
  onAddPlayer?: () => void;
  /** Above the search row, e.g. the join requests banner. */
  top?: ReactNode;
  /** Between the table and the pending invites card. */
  afterTable?: ReactNode;
}) {
  const locale = useLocale();
  const m = useMessages();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const canManage =
    canSetLevel || canAddPlayers || canRemovePlayers || canAppointOrganizers;
  const isManaging = canManage && managing;
  const legend = groupMembersLegend({ showLevel, locale });
  const list = memberList(
    leaderboard,
    query,
    apiOrigin,
    locale,
    canSetLevel,
    canRemovePlayers,
    canAppointOrganizers,
  );
  const selected = leaderboard.find(
    (entry) =>
      entry.userId === selectedUserId &&
      !entry.isViewer &&
      (canSetLevel ||
        (canAddPlayers && entry.unclaimed) ||
        memberIsRemovable(entry, canRemovePlayers) ||
        memberOrganizerAction(entry, canAppointOrganizers) != null),
  );
  const organizerAction = selected
    ? memberOrganizerAction(selected, canAppointOrganizers)
    : null;

  if (list.isEmpty) {
    return (
      <View style={{ gap: 14 }}>
        {top}
        <Notice {...m.mobileGroup.members.empty} />
        {afterTable}
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {top}
      {list.showSearch || canManage ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {list.showSearch ? (
              <SearchField
                value={query}
                onChangeText={onQueryChange}
                placeholder={m.mobileGroup.members.searchPlaceholder}
                accessibilityLabel={m.mobileGroup.members.searchPlaceholder}
                autoCorrect={false}
                returnKeyType="search"
              />
            ) : null}
          </View>
          {canManage ? (
            <Button
              label={isManaging ? m.common.done : m.mobileGroup.members.manage}
              variant={isManaging ? "default" : "outline"}
              selected={isManaging}
              onPress={() => setManaging((current) => !current)}
            />
          ) : null}
        </View>
      ) : null}
      {isManaging && canAddPlayers && onAddPlayer ? (
        <Button
          label={m.group.addPlayer.action}
          variant="outline"
          icon={<UserRoundPlus size={sizes.iconRow} color={colors.ink} />}
          onPress={onAddPlayer}
        />
      ) : null}
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        <TableHeader managing={isManaging} showLevel={showLevel} />
        {list.rows.length === 0 ? (
          <>
            <Hairline />
            <Text
              size="meta"
              tone="muted"
              style={{ paddingHorizontal: 18, paddingVertical: 22 }}
            >
              {m.group.members.noMatch}
            </Text>
          </>
        ) : (
          list.rows.map((row) => (
            <View key={row.key}>
              <Hairline />
              <MemberRow
                row={row}
                showLevel={showLevel}
                managing={isManaging}
                onOpen={onOpenMember ? () => onOpenMember(row.key) : undefined}
                onManage={
                  row.selectable ? () => setSelectedUserId(row.key) : undefined
                }
              />
            </View>
          ))
        )}
        {legend ? (
          <>
            <Hairline />
            <Text
              size="eyebrow"
              tone="muted"
              style={{ paddingHorizontal: 18, paddingVertical: 12 }}
            >
              {legend}
            </Text>
          </>
        ) : null}
      </Surface>
      {afterTable}
      {pendingInviteNames.length > 0 && onOpenInvites ? (
        <PendingInvitesCard names={pendingInviteNames} onOpen={onOpenInvites} />
      ) : null}
      <MemberSheet
        member={selected ? memberSheetView(selected, locale, apiOrigin) : null}
        onClose={() => setSelectedUserId(null)}
        onSetLevel={
          canSetLevel
            ? () => {
                if (selected) {
                  setSelectedUserId(null);
                  onSetLevel(selected.userId);
                }
              }
            : undefined
        }
        onViewProfile={
          onOpenMember
            ? () => {
                if (selected) {
                  setSelectedUserId(null);
                  onOpenMember(selected.userId);
                }
              }
            : undefined
        }
        organizerLabel={
          organizerAction
            ? groupMemberOrganizerActionLabel(organizerAction, locale)
            : undefined
        }
        organizerHint={
          organizerAction
            ? groupMemberOrganizerActionHint(organizerAction, locale)
            : undefined
        }
        onOrganizerAction={
          selected && organizerAction && onOrganizerAction
            ? () => {
                setSelectedUserId(null);
                onOrganizerAction(
                  {
                    userId: selected.userId,
                    name: selected.name ?? m.mobileGroup.unnamedMember,
                  },
                  organizerAction,
                );
              }
            : undefined
        }
        onRename={
          selected && onRenameUnclaimed && canAddPlayers && selected.unclaimed
            ? () => {
                setSelectedUserId(null);
                onRenameUnclaimed({
                  userId: selected.userId,
                  name: selected.name ?? m.mobileGroup.unnamedMember,
                });
              }
            : undefined
        }
        onRemove={
          selected &&
          onRemovePlayer &&
          memberIsRemovable(selected, canRemovePlayers)
            ? () => {
                setSelectedUserId(null);
                onRemovePlayer({
                  userId: selected.userId,
                  name: selected.name ?? m.mobileGroup.unnamedMember,
                });
              }
            : undefined
        }
      />
    </View>
  );
}
