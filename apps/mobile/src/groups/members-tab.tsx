import { radii, sizes } from "@repo/design-tokens";
import type {
  GroupLeaderboardEntryData,
  GroupTierSummaryData,
} from "@repo/domain/group-data";
import type { LevelFace } from "@repo/domain/football-ovr";
import {
  groupMemberOrganizerActionHint,
  groupMemberOrganizerActionLabel,
  type GroupMemberOrganizerAction,
} from "@repo/domain/group-home-chrome";
import {
  groupMembersLegend,
  groupPendingInvitesTitle,
  groupTierProvisionalLine,
  groupTierSharkCard,
} from "@repo/domain/group-members-table";
import {
  ChevronRight,
  EllipsisVertical,
  UserRoundPlus,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Linking, Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { mediaUrl } from "../lib/media-url";
import { useRowWindow, windowedRows } from "../lib/row-window";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { SearchField } from "../primitives/search-field";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import {
  memberIsCallable,
  memberIsRemovable,
  memberList,
  memberOrganizerAction,
  memberSheetView,
  type MemberRowView,
} from "./group-home-model";
import { AdjustTierSheet } from "./adjust-tier-sheet";
import { LevelCell } from "./level-cell";
import type { MemberNicknameTarget } from "./member-nickname-model";
import { MemberNicknameSheet } from "./member-nickname-sheet";
import { MemberSheet } from "./member-sheet";
import { MemberLensRow, MemberSortSheet } from "./members-lens";
import { NicknameName } from "../primitives/nickname-name";
import { Notice } from "./notice";
import { TIER_WIDTH, TierCell, TierFish } from "./tier-fish";
import { useMemberLens } from "./use-member-lens";

const LEVEL_WIDTH = 52;
/** `C+ 72`: the band and the OVR, on a Verified football Group. */
const OVR_WIDTH = 64;
const POINTS_WIDTH = 52;
const ACTION_WIDTH = 44;
const ROW_PADDING_START = 16;
const ROW_PADDING_END = 10;

function YouMark() {
  const m = useMessages();
  const colors = useColors();
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

function AddNameButton({
  name,
  onPress,
}: {
  name: string;
  onPress: () => void;
}) {
  const m = useMessages();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.mobileGroup.nickname.addNameFor(name)}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        justifyContent: "center",
        paddingHorizontal: 4,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text size="eyebrow" tone="muted">
        {m.mobileGroup.nickname.addName}
      </Text>
    </Pressable>
  );
}

function MemberRow({
  row,
  showLevel,
  levelFace,
  managing,
  onOpen,
  onManage,
  onAddName,
}: {
  row: MemberRowView;
  showLevel: boolean;
  levelFace: LevelFace;
  managing: boolean;
  onOpen?: () => void;
  onManage?: () => void;
  /** While managing, a member with no Member nickname offers one. */
  onAddName?: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const tier = row.tier;
  const content = (
    <>
      {tier ? (
        <View style={{ width: TIER_WIDTH, alignItems: "center" }}>
          <TierCell cell={tier.cell} />
        </View>
      ) : (
        <Avatar name={row.tembaName} uri={row.imageUri} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <NicknameName name={row.name} isNickname={row.nickname != null} />
          {row.isViewer ? <YouMark /> : null}
        </View>
        {row.unclaimed ? <NotOnTembaMark /> : null}
        {row.caption ? (
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {row.caption}
          </Text>
        ) : null}
      </View>
      {tier ? (
        <Text
          size={tier.pointsMuted ? "eyebrow" : "body"}
          weight={tier.pointsMuted ? "regular" : "bold"}
          tone={tier.pointsMuted ? "muted" : undefined}
          style={{ width: POINTS_WIDTH, textAlign: "right" }}
        >
          {tier.points}
        </Text>
      ) : showLevel ? (
        <View
          style={{
            width: levelFace === "ovr" ? OVR_WIDTH : LEVEL_WIDTH,
            alignItems: "center",
          }}
        >
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
        {onAddName ? (
          <AddNameButton name={row.tembaName} onPress={onAddName} />
        ) : null}
        {onManage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.mobileGroup.members.manageName(row.tembaName)}
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

/** The member's own Member nickname (design "Group names" 1e). */
function ViewerNicknameCard({
  nickname,
  name,
  imageUri,
}: {
  nickname: string;
  name: string;
  imageUri: string | null;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Surface
      radius="card"
      style={{ gap: 12, backgroundColor: colors.wash }}
      accessible
      accessibilityLabel={m.mobileGroup.nickname.youAreSpoken(nickname)}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={name} uri={imageUri} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text size="eyebrow" tone="muted">
            {m.mobileGroup.nickname.youAre}
          </Text>
          <NicknameName
            name={nickname}
            isNickname
            size="title"
            weight="bold"
            iconSize={sizes.iconAction}
          />
        </View>
      </View>
      <Hairline />
      <Text size="meta" tone="muted">
        {m.mobileGroup.nickname.youAreNote}
      </Text>
    </Surface>
  );
}

function TableHeader({
  managing,
  showLevel,
  levelFace,
  showTier,
  countLine,
}: {
  managing: boolean;
  showLevel: boolean;
  levelFace: LevelFace;
  showTier: boolean;
  countLine: string;
}) {
  const m = useMessages();
  const colors = useColors();
  const tierCopy = m.rating.tier;
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
      {showTier ? (
        <Text
          size="eyebrow"
          tone="muted"
          style={{ width: TIER_WIDTH, textAlign: "center" }}
        >
          {tierCopy.columnTier}
        </Text>
      ) : null}
      <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
        {showTier ? tierCopy.columnPlayer : m.mobileGroup.members.columnMember}
      </Text>
      <Text size="eyebrow" tone="muted" mono>
        {countLine}
      </Text>
      {showTier ? (
        <Text
          size="eyebrow"
          tone="muted"
          style={{ width: POINTS_WIDTH, textAlign: "right" }}
        >
          {tierCopy.columnPoints}
        </Text>
      ) : showLevel ? (
        <Text
          size="eyebrow"
          tone="muted"
          mono
          accessibilityLabel={m.common.level}
          style={{
            width: levelFace === "ovr" ? OVR_WIDTH : LEVEL_WIDTH,
            textAlign: "center",
          }}
        >
          {levelFace === "ovr"
            ? m.rating.ovr.label
            : m.mobileGroup.members.columnLevel}
        </Text>
      ) : null}
      {managing ? <View style={{ width: ACTION_WIDTH }} /> : null}
    </View>
  );
}

function SharkCard({ summary }: { summary: GroupTierSummaryData | null }) {
  const locale = useLocale();
  const colors = useColors();
  const card = groupTierSharkCard(summary, new Date(), locale);
  if (!card) {
    return null;
  }
  return (
    <View
      accessible
      accessibilityLabel={[card.title, card.name, card.line].join(". ")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.wash,
      }}
    >
      <TierFish
        band="shark"
        label={card.fishLabel}
        size="card"
        cutout={colors.wash}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="eyebrow" tone="muted">
          {card.title}
        </Text>
        <Text size="title" weight="bold" width="expanded" numberOfLines={1}>
          {card.name}
        </Text>
        <Text size="meta" tone="muted">
          {card.line}
        </Text>
      </View>
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
  const colors = useColors();
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
  groupId,
  leaderboard,
  query,
  onQueryChange,
  apiOrigin,
  canSetLevel,
  showLevel = true,
  levelFace = "level",
  tierSummary,
  groupName = "",
  canAdjustTier = false,
  onOpenTierHistory,
  onSetLevel,
  onOpenMember,
  canAddPlayers = false,
  onRenameUnclaimed,
  canRemovePlayers = false,
  onRemovePlayer,
  canAppointOrganizers = false,
  onOrganizerAction,
  canSetNicknames = false,
  pendingInviteNames = [],
  onOpenInvites,
  onAddPlayer,
  top,
  afterTable,
}: {
  groupId: string;
  leaderboard: GroupLeaderboardEntryData[];
  query: string;
  onQueryChange: (query: string) => void;
  apiOrigin: string;
  canSetLevel: boolean;
  showLevel?: boolean;
  /** OVR on a Verified football Group (ADR-0069). */
  levelFace?: LevelFace;
  /** A tier Group's Members: fish, points and the Shark. */
  tierSummary?: GroupTierSummaryData | null;
  groupName?: string;
  /** An Organizer of a tier Group adjusts members' Tier points. */
  canAdjustTier?: boolean;
  /** Points and history, for an Organizer of a tier Group. */
  onOpenTierHistory?: (userId: string) => void;
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
  canSetNicknames?: boolean;
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
  const colors = useColors();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [naming, setNaming] = useState<MemberNicknameTarget | null>(null);
  const { lens, setSort, setFilter } = useMemberLens(groupId);
  const canManage =
    canSetLevel ||
    canAdjustTier ||
    canAddPlayers ||
    canRemovePlayers ||
    canAppointOrganizers ||
    canSetNicknames;
  const isManaging = canManage && managing;
  const showTier = tierSummary != null;
  const legend = groupMembersLegend({ showLevel, showTier, locale });
  const provisionalLine = groupTierProvisionalLine(tierSummary, locale);
  const list = memberList(
    leaderboard,
    query,
    apiOrigin,
    locale,
    canSetLevel,
    canRemovePlayers,
    canAppointOrganizers,
    { ...lens, showLevel, showTier, canManage, now: new Date() },
    canAdjustTier,
    canSetNicknames,
  );
  const rowWindow = useRowWindow(
    [query, lens.sort, lens.filter].join("\u0000"),
  );
  const rows = windowedRows(list.rows, rowWindow.count);
  const selected = leaderboard.find(
    (entry) =>
      entry.userId === selectedUserId &&
      !entry.isViewer &&
      (canSetLevel ||
        (canAdjustTier && entry.tier != null) ||
        (canAddPlayers && entry.canRename === true) ||
        memberIsRemovable(entry, canRemovePlayers) ||
        memberOrganizerAction(entry, canAppointOrganizers) != null ||
        memberIsCallable(entry) ||
        canSetNicknames),
  );
  const viewerEntry = leaderboard.find((entry) => entry.isViewer);
  const showsNicknameLegend = leaderboard.some(
    (entry) => entry.nickname != null,
  );
  const nicknameTarget = (
    entry: GroupLeaderboardEntryData,
  ): MemberNicknameTarget => ({
    userId: entry.userId,
    name: entry.name ?? m.mobileGroup.unnamedMember,
    imageUri: mediaUrl(entry.image, apiOrigin),
    nickname: entry.nickname ?? null,
    isViewer: entry.isViewer,
  });
  const openNaming = (userId: string) => {
    const entry = leaderboard.find((row) => row.userId === userId);
    if (entry) {
      setNaming(nicknameTarget(entry));
    }
  };
  const organizerAction = selected
    ? memberOrganizerAction(selected, canAppointOrganizers)
    : null;
  const adjusting = canAdjustTier
    ? leaderboard.find(
        (entry) =>
          entry.userId === adjustingUserId &&
          !entry.isViewer &&
          entry.tier != null,
      )
    : undefined;

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
      {showTier ? <SharkCard summary={tierSummary} /> : null}
      {viewerEntry?.nickname?.visibility === "group" ? (
        <ViewerNicknameCard
          nickname={viewerEntry.nickname.name}
          name={viewerEntry.name ?? m.mobileGroup.unnamedMember}
          imageUri={mediaUrl(viewerEntry.image, apiOrigin)}
        />
      ) : null}
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
      {list.showSearch ? (
        <MemberLensRow
          sortLabel={list.sortLabel}
          filters={list.filters}
          onOpenSort={() => setSortOpen(true)}
          onPickFilter={(chip) => setFilter(chip.id)}
        />
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
        <TableHeader
          managing={isManaging}
          showLevel={showLevel}
          levelFace={levelFace}
          showTier={showTier}
          countLine={list.countLine}
        />
        {list.rows.length === 0 ? (
          <>
            <Hairline />
            <View
              style={{
                paddingHorizontal: 18,
                paddingVertical: 22,
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <Text size="meta" tone="muted">
                {list.emptyText}
              </Text>
              <Button
                label={m.group.members.lens.showAll}
                variant="outline"
                onPress={() => {
                  onQueryChange("");
                  setFilter("all");
                }}
              />
            </View>
          </>
        ) : (
          rows.shown.map((row) => (
            <View key={row.key}>
              <Hairline />
              <MemberRow
                row={row}
                showLevel={showLevel}
                levelFace={levelFace}
                managing={isManaging}
                onOpen={onOpenMember ? () => onOpenMember(row.key) : undefined}
                onManage={
                  row.isViewer
                    ? canSetNicknames && row.nickname != null
                      ? () => openNaming(row.key)
                      : undefined
                    : row.selectable
                      ? () => setSelectedUserId(row.key)
                      : undefined
                }
                onAddName={
                  canSetNicknames && row.nickname == null
                    ? () => openNaming(row.key)
                    : undefined
                }
              />
            </View>
          ))
        )}
        {rows.hidden > 0 ? (
          <>
            <Hairline />
            <View style={{ padding: 12, alignItems: "center" }}>
              <Button
                label={m.common.showMore}
                variant="outline"
                onPress={rowWindow.showMore}
              />
            </View>
          </>
        ) : null}
        {legend || showsNicknameLegend ? (
          <>
            <Hairline />
            <View
              style={{ paddingHorizontal: 18, paddingVertical: 12, gap: 6 }}
            >
              {legend ? (
                <Text size="eyebrow" tone="muted">
                  {legend}
                </Text>
              ) : null}
              {showsNicknameLegend ? (
                <Text size="eyebrow" tone="muted">
                  {m.mobileGroup.nickname.legend}
                </Text>
              ) : null}
              {provisionalLine ? (
                <Text size="eyebrow" weight="semibold">
                  {provisionalLine}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </Surface>
      {afterTable}
      {pendingInviteNames.length > 0 && onOpenInvites ? (
        <PendingInvitesCard names={pendingInviteNames} onOpen={onOpenInvites} />
      ) : null}
      <MemberSortSheet
        visible={sortOpen}
        options={list.sorts}
        onClose={() => setSortOpen(false)}
        onPick={(sort) => {
          setSort(sort);
          setSortOpen(false);
        }}
      />
      <MemberSheet
        member={selected ? memberSheetView(selected, locale, apiOrigin) : null}
        onClose={() => setSelectedUserId(null)}
        onCall={(href) => void Linking.openURL(href)}
        onWhatsApp={(href) => void Linking.openURL(href)}
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
        onTierHistory={
          selected &&
          canAdjustTier &&
          selected.tier != null &&
          onOpenTierHistory
            ? () => {
                setSelectedUserId(null);
                onOpenTierHistory(selected.userId);
              }
            : undefined
        }
        onAdjustTier={
          selected && canAdjustTier && selected.tier != null
            ? () => {
                setSelectedUserId(null);
                setAdjustingUserId(selected.userId);
              }
            : undefined
        }
        onNickname={
          selected && canSetNicknames
            ? () => {
                setSelectedUserId(null);
                setNaming(nicknameTarget(selected));
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
          selected &&
          onRenameUnclaimed &&
          canAddPlayers &&
          selected.canRename === true
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
      {canAdjustTier ? (
        <AdjustTierSheet
          groupId={groupId}
          groupName={groupName}
          members={leaderboard.map((entry) => ({
            userId: entry.userId,
            name: entry.name ?? m.mobileGroup.unnamedMember,
            joinedAt: entry.joinedAt,
            tier: entry.tier,
            level: entry.level,
            groupLevel: entry.groupLevel,
          }))}
          member={
            adjusting
              ? {
                  userId: adjusting.userId,
                  imageUri: mediaUrl(adjusting.image, apiOrigin),
                }
              : null
          }
          onClose={() => setAdjustingUserId(null)}
        />
      ) : null}
      <MemberNicknameSheet
        groupId={groupId}
        groupName={groupName}
        member={naming}
        onClose={() => setNaming(null)}
      />
    </View>
  );
}
