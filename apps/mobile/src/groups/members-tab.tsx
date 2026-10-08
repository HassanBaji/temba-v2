import { colors, sizes, spacing } from "@repo/design-tokens";
import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { FormSlot } from "../primitives/form-slot";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import {
  MEMBERS_EMPTY_COPY,
  MEMBERS_NO_MATCH_COPY,
  MEMBERS_SET_LEVEL_HINT,
  memberList,
  memberSheetView,
  type MemberRowView,
} from "./group-home-model";
import { LevelCell } from "./level-cell";
import { MemberSheet } from "./member-sheet";
import { Notice } from "./notice";

const MARK_WIDTH = 16;

function MemberRowContent({ row }: { row: MemberRowView }) {
  return (
    <>
      <Avatar name={row.name} uri={row.imageUri} size="lg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight={row.isViewer ? "semibold" : "regular"} numberOfLines={1}>
          {row.isViewer ? "You" : row.name}
        </Text>
        {row.caption ? (
          <Text size="meta" tone="muted" numberOfLines={1}>
            {row.caption}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {row.formMarks.map((mark, index) => (
          <View key={index} style={{ width: MARK_WIDTH }}>
            <FormSlot variant={mark} compact />
          </View>
        ))}
      </View>
      <LevelCell view={row.level} level={row.levelText} />
    </>
  );
}

function MemberRow({
  row,
  onSelect,
  onOpen,
}: {
  row: MemberRowView;
  onSelect: () => void;
  onOpen?: (userId: string) => void;
}) {
  const style = {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.surface,
    paddingVertical: 12,
  } as const;

  if (!row.selectable && onOpen) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.accessibilityLabel}
        accessibilityHint="Opens their Player profile"
        onPress={() => onOpen(row.key)}
        style={({ pressed }) => ({ ...style, opacity: pressed ? 0.6 : 1 })}
      >
        <MemberRowContent row={row} />
      </Pressable>
    );
  }

  if (!row.selectable) {
    return (
      <View
        accessible
        accessibilityLabel={row.accessibilityLabel}
        style={style}
      >
        <MemberRowContent row={row} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      accessibilityHint="Opens the member sheet"
      onPress={onSelect}
      style={({ pressed }) => ({ ...style, opacity: pressed ? 0.6 : 1 })}
    >
      <MemberRowContent row={row} />
      <ChevronRight size={sizes.iconAction} color={colors.muted} />
    </Pressable>
  );
}

export function MembersTab({
  leaderboard,
  query,
  onQueryChange,
  apiOrigin,
  canSetLevel,
  onSetLevel,
  onOpenMember,
}: {
  leaderboard: GroupLeaderboardEntryData[];
  query: string;
  onQueryChange: (query: string) => void;
  apiOrigin: string;
  canSetLevel: boolean;
  onSetLevel: (userId: string) => void;
  onOpenMember?: (userId: string) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const list = memberList(leaderboard, query, apiOrigin, canSetLevel);
  const selected = canSetLevel
    ? leaderboard.find(
        (entry) => entry.userId === selectedUserId && !entry.isViewer,
      )
    : undefined;

  if (list.isEmpty) {
    return <Notice {...MEMBERS_EMPTY_COPY} />;
  }

  return (
    <View style={{ gap: spacing.compact }}>
      {list.showSearch ? (
        <TextField
          label="Search members"
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search members"
          autoCorrect={false}
          returnKeyType="search"
        />
      ) : null}
      {list.rows.length === 0 ? (
        <Text tone="muted">{MEMBERS_NO_MATCH_COPY}</Text>
      ) : (
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {list.rows.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <Hairline /> : null}
              <MemberRow
                row={row}
                onSelect={() => setSelectedUserId(row.key)}
                onOpen={onOpenMember}
              />
            </View>
          ))}
        </Surface>
      )}
      {canSetLevel ? (
        <Text size="meta" tone="muted">
          {MEMBERS_SET_LEVEL_HINT}
        </Text>
      ) : null}
      {canSetLevel ? (
        <MemberSheet
          member={selected ? memberSheetView(selected) : null}
          onClose={() => setSelectedUserId(null)}
          onSetLevel={() => {
            if (selected) {
              setSelectedUserId(null);
              onSetLevel(selected.userId);
            }
          }}
        />
      ) : null}
    </View>
  );
}
