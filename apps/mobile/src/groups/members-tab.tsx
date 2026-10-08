import { spacing } from "@repo/design-tokens";
import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
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
  memberList,
  type MemberRowView,
} from "./group-home-model";
import { LevelCell } from "./level-cell";
import { Notice } from "./notice";

const MARK_WIDTH = 16;

function MemberRow({
  row,
  onOpen,
}: {
  row: MemberRowView;
  onOpen?: (userId: string) => void;
}) {
  const content = (
    <View
      accessible={!onOpen}
      accessibilityLabel={onOpen ? undefined : row.accessibilityLabel}
      style={{
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: 12,
      }}
    >
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
      <LevelCell view={row.level} />
    </View>
  );

  if (!onOpen) {
    return content;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      accessibilityHint="Opens their Player profile"
      onPress={() => onOpen(row.key)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function MembersTab({
  leaderboard,
  query,
  onQueryChange,
  apiOrigin,
  onOpenMember,
}: {
  leaderboard: GroupLeaderboardEntryData[];
  query: string;
  onQueryChange: (query: string) => void;
  apiOrigin: string;
  onOpenMember?: (userId: string) => void;
}) {
  const list = memberList(leaderboard, query, apiOrigin);

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
              <MemberRow row={row} onOpen={onOpenMember} />
            </View>
          ))}
        </Surface>
      )}
    </View>
  );
}
