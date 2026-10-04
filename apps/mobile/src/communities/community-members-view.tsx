import { spacing } from "@repo/design-tokens";
import {
  COMMUNITY_INVITE_BLOCK_COPY,
  COMMUNITY_MEMBERS_ERROR_TITLE,
  COMMUNITY_MEMBERS_NO_MATCH_COPY,
  COMMUNITY_NO_MEMBERS_EMPTY,
  COMMUNITY_ROLE_CHOICES,
  communityMemberList,
  type CommunityMemberRow,
} from "@repo/domain/community";
import type { CommunityMemberData } from "@repo/domain/community-data";
import type { CommunityRoleValue } from "@repo/domain/community-role-change";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { ChoiceRow } from "../lib/choice-row";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export type CommunityMembersViewProps = {
  members: Slot<CommunityMemberData[]>;
  viewerUserId: string | undefined;
  apiOrigin: string;
  query: string;
  onQueryChange: (query: string) => void;
  canManageRoles: boolean;
  rolePending: boolean;
  onRoleChange: (row: CommunityMemberRow, role: CommunityRoleValue) => void;
  leaveNotices: string[];
  canInvite: boolean;
  onInvite: () => void;
  onRetry: () => void;
};

function MemberRowView({
  row,
  apiOrigin,
  canManageRoles,
  rolePending,
  onRoleChange,
}: {
  row: CommunityMemberRow;
  apiOrigin: string;
  canManageRoles: boolean;
  rolePending: boolean;
  onRoleChange: (role: CommunityRoleValue) => void;
}) {
  return (
    <View style={{ gap: 10, padding: spacing.surface }}>
      <View
        accessible
        accessibilityLabel={[row.displayName, row.email, row.roleLabel]
          .filter(Boolean)
          .join(", ")}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <Avatar
          name={row.name}
          uri={mediaUrl(row.image, apiOrigin)}
          size="lg"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight={row.isSelf ? "semibold" : "regular"} numberOfLines={1}>
            {row.displayName}
          </Text>
          {row.email ? (
            <Text size="meta" tone="muted" numberOfLines={1}>
              {row.email}
            </Text>
          ) : null}
        </View>
        {canManageRoles ? null : (
          <Text size="eyebrow" tone="muted" mono uppercase>
            {row.roleLabel}
          </Text>
        )}
      </View>
      {canManageRoles ? (
        <ChoiceRow
          label={`Role for ${row.name}`}
          choices={COMMUNITY_ROLE_CHOICES}
          value={row.role}
          onSelect={onRoleChange}
          disabled={rolePending}
        />
      ) : null}
    </View>
  );
}

function MemberList(props: CommunityMembersViewProps) {
  const { members } = props;
  if (members.status === "loading") {
    return <Skeleton height={160} radius={16} />;
  }
  if (members.status === "error") {
    return (
      <Notice
        alert
        title={COMMUNITY_MEMBERS_ERROR_TITLE}
        description={members.message}
        onRetry={props.onRetry}
      />
    );
  }
  const list = communityMemberList(
    members.value,
    props.viewerUserId,
    props.query,
  );
  if (list.isEmpty) {
    return <Notice {...COMMUNITY_NO_MEMBERS_EMPTY} />;
  }
  return (
    <View style={{ gap: spacing.compact }}>
      {list.showSearch ? (
        <TextField
          label="Search members"
          value={props.query}
          onChangeText={props.onQueryChange}
          placeholder="Search members"
          autoCorrect={false}
          returnKeyType="search"
        />
      ) : null}
      {list.rows.length === 0 ? (
        <Text tone="muted">{COMMUNITY_MEMBERS_NO_MATCH_COPY}</Text>
      ) : (
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {list.rows.map((row, index) => (
            <View key={row.id}>
              {index > 0 ? <Hairline /> : null}
              <MemberRowView
                row={row}
                apiOrigin={props.apiOrigin}
                canManageRoles={props.canManageRoles}
                rolePending={props.rolePending}
                onRoleChange={(role) => props.onRoleChange(row, role)}
              />
            </View>
          ))}
        </Surface>
      )}
    </View>
  );
}

export function CommunityMembersView(props: CommunityMembersViewProps) {
  return (
    <View style={{ gap: spacing.compact }}>
      {props.leaveNotices.map((notice) => (
        <Text key={notice} tone="muted">
          {notice}
        </Text>
      ))}
      <MemberList {...props} />
      {props.canInvite ? (
        <Surface style={{ gap: 8 }}>
          <Text size="lead" weight="semibold">
            {COMMUNITY_INVITE_BLOCK_COPY.title}
          </Text>
          <Text size="meta" tone="muted">
            {COMMUNITY_INVITE_BLOCK_COPY.description}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            <Button
              label={COMMUNITY_INVITE_BLOCK_COPY.action}
              onPress={props.onInvite}
            />
          </View>
        </Surface>
      ) : null}
    </View>
  );
}
