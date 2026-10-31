import { colors, radii, sizes } from "@repo/design-tokens";
import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
import {
  groupMemberOrganizerActionLabel,
  type GroupMemberOrganizerAction,
} from "@repo/domain/group-home-chrome";
import {
  GROUP_MEMBERS_DEFAULT_SORT,
  GROUP_MEMBERS_NO_MATCH_COPY,
  groupMembersLegend,
  groupPendingInvitesTitle,
  type GroupMembersSort,
} from "@repo/domain/group-members-table";
import { ADD_PLAYER_ACTION } from "@repo/domain/add-player-by-phone";
import {
  ChevronRight,
  EllipsisVertical,
  UserRoundPlus,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";

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
  MEMBERS_EMPTY_COPY,
  memberIsRemovable,
  memberList,
  memberOrganizerAction,
  memberSheetView,
  type MemberRowView,
} from "./group-home-model";
import { LevelCell } from "./level-cell";
import { MemberSheet } from "./member-sheet";
import { Notice } from "./notice";

const STAT_WIDTH = 38;
const LEVEL_WIDTH = 44;
const ACTION_WIDTH = 44;
const ROW_PADDING_LEFT = 16;
const ROW_PADDING_RIGHT = 10;

const SORT_COLUMNS: {
  sort: GroupMembersSort;
  label: string;
  title: string;
  width: number;
}[] = [
  { sort: "played", label: "P", title: "Games played", width: STAT_WIDTH },
  { sort: "won", label: "W", title: "Matches won", width: STAT_WIDTH },
  { sort: "level", label: "LVL", title: "Level", width: LEVEL_WIDTH },
];

function YouMark() {
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
        YOU
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
      <Text
        width="expanded"
        weight="bold"
        style={{ width: STAT_WIDTH, textAlign: "center" }}
      >
        {row.played}
      </Text>
      {managing ? null : (
        <Text
          size="meta"
          tone="muted"
          style={{ width: STAT_WIDTH, textAlign: "center" }}
        >
          {row.wins}
        </Text>
      )}
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
    paddingLeft: ROW_PADDING_LEFT,
    paddingRight: managing ? 0 : ROW_PADDING_RIGHT,
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
            accessibilityLabel={`Manage ${row.name}`}
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
        accessibilityHint="Opens their Player profile"
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
  sort,
  onSort,
  managing,
  showLevel,
}: {
  sort: GroupMembersSort;
  onSort: (sort: GroupMembersSort) => void;
  managing: boolean;
  showLevel: boolean;
}) {
  const columns = SORT_COLUMNS.filter(
    (column) =>
      (column.sort !== "won" || !managing) &&
      (column.sort !== "level" || showLevel),
  );
  return (
    <View
      style={{
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: ROW_PADDING_LEFT,
        paddingRight: managing ? 0 : ROW_PADDING_RIGHT,
        backgroundColor: colors.wash,
      }}
    >
      <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
        Member
      </Text>
      {columns.map((column) => {
        const active = column.sort === sort;
        return (
          <Pressable
            key={column.sort}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${column.title}`}
            accessibilityState={{ selected: active }}
            onPress={() => onSort(column.sort)}
            style={{
              width: column.width,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              size="eyebrow"
              mono
              tone={active ? "default" : "muted"}
              style={{
                textDecorationLine: active ? "underline" : "none",
              }}
            >
              {column.label}
            </Text>
          </Pressable>
        );
      })}
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
  const title = groupPendingInvitesTitle(names.length);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${names.join(", ")}`}
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
      <ChevronRight size={sizes.iconRow + 2} color={colors.dim} />
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sort, setSort] = useState<GroupMembersSort>(
    GROUP_MEMBERS_DEFAULT_SORT,
  );
  const [managing, setManaging] = useState(false);
  const canManage =
    canSetLevel || canAddPlayers || canRemovePlayers || canAppointOrganizers;
  const isManaging = canManage && managing;
  const list = memberList(
    leaderboard,
    query,
    apiOrigin,
    canSetLevel,
    canRemovePlayers,
    canAppointOrganizers,
    sort,
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
        <Notice {...MEMBERS_EMPTY_COPY} />
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
                placeholder="Search members"
                accessibilityLabel="Search members"
                autoCorrect={false}
                returnKeyType="search"
              />
            ) : null}
          </View>
          {canManage ? (
            <Button
              label={isManaging ? "Done" : "Manage"}
              variant={isManaging ? "default" : "outline"}
              selected={isManaging}
              onPress={() => setManaging((current) => !current)}
            />
          ) : null}
        </View>
      ) : null}
      {isManaging && canAddPlayers && onAddPlayer ? (
        <Button
          label={ADD_PLAYER_ACTION}
          variant="outline"
          icon={<UserRoundPlus size={sizes.iconRow} color={colors.ink} />}
          onPress={onAddPlayer}
        />
      ) : null}
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        <TableHeader
          sort={sort}
          onSort={setSort}
          managing={isManaging}
          showLevel={showLevel}
        />
        {list.rows.length === 0 ? (
          <>
            <Hairline />
            <Text
              size="meta"
              tone="muted"
              style={{ paddingHorizontal: 18, paddingVertical: 22 }}
            >
              {GROUP_MEMBERS_NO_MATCH_COPY}
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
        <Hairline />
        <Text
          size="eyebrow"
          tone="muted"
          style={{ paddingHorizontal: 18, paddingVertical: 12 }}
        >
          {groupMembersLegend({ managing: isManaging, showLevel })}
        </Text>
      </Surface>
      {afterTable}
      {pendingInviteNames.length > 0 && onOpenInvites ? (
        <PendingInvitesCard names={pendingInviteNames} onOpen={onOpenInvites} />
      ) : null}
      <MemberSheet
        member={selected ? memberSheetView(selected) : null}
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
            ? groupMemberOrganizerActionLabel(organizerAction)
            : undefined
        }
        onOrganizerAction={
          selected && organizerAction && onOrganizerAction
            ? () => {
                setSelectedUserId(null);
                onOrganizerAction(
                  { userId: selected.userId, name: selected.name ?? "Member" },
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
                  name: selected.name ?? "Member",
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
                  name: selected.name ?? "Member",
                });
              }
            : undefined
        }
      />
    </View>
  );
}
