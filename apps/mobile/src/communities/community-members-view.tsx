import { spacing } from "@repo/design-tokens";
import {
  communityMemberList,
  communityRoleChoices,
  type CommunityMemberRow,
} from "@repo/domain/community";
import type { CommunityMemberData } from "@repo/domain/community-data";
import type { CommunityRoleValue } from "@repo/domain/community-role-change";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
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
  const m = useMessages();
  const locale = useLocale();
  return (
    <View style={{ gap: 10, padding: spacing.surface }}>
      <View
        accessible
        accessibilityLabel={[row.displayName, row.email, row.roleLabel]
          .filter(Boolean)
          .join(m.group.metaSeparator)}
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
          label={m.mobileCommunity.members.roleFor(row.name)}
          choices={communityRoleChoices(locale)}
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
  const m = useMessages();
  const locale = useLocale();
  if (members.status === "loading") {
    return <Skeleton height={160} radius={16} />;
  }
  if (members.status === "error") {
    return (
      <Notice
        alert
        title={m.community.membersErrorTitle}
        description={members.message}
        onRetry={props.onRetry}
      />
    );
  }
  const list = communityMemberList(
    members.value,
    props.viewerUserId,
    props.query,
    locale,
  );
  if (list.isEmpty) {
    return <Notice {...m.community.noMembersEmpty} />;
  }
  return (
    <View style={{ gap: spacing.compact }}>
      {list.showSearch ? (
        <TextField
          label={m.mobileCommunity.members.search}
          value={props.query}
          onChangeText={props.onQueryChange}
          placeholder={m.mobileCommunity.members.search}
          autoCorrect={false}
          returnKeyType="search"
        />
      ) : null}
      {list.rows.length === 0 ? (
        <Text tone="muted">{m.community.membersNoMatch}</Text>
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
  const m = useMessages();
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
            {m.community.inviteBlock.title}
          </Text>
          <Text size="meta" tone="muted">
            {m.community.inviteBlock.description}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            <Button
              label={m.community.inviteBlock.action}
              onPress={props.onInvite}
            />
          </View>
        </Surface>
      ) : null}
    </View>
  );
}
