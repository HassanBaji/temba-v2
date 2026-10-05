import { sizes, spacing } from "@repo/design-tokens";
import {
  COMMUNITIES_ERROR_TITLE,
  COMMUNITIES_TITLE,
  COMMUNITY_NO_GROUPS_COPY,
  COMMUNITY_START_COPY,
  communityClubGroupRow,
} from "@repo/domain/community";
import { communityListMetaLine } from "@repo/domain/community-chrome";
import type { CommunityMineRowData } from "@repo/domain/community-data";
import { Pressable, View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export type CommunitiesViewProps = {
  communities: Slot<CommunityMineRowData[]>;
  apiOrigin: string;
  onOpen: (communityId: string) => void;
  onOpenGroup: (groupId: string) => void;
  onCreate: () => void;
  onRetry: () => void;
};

function CommunityCard({
  community,
  apiOrigin,
  onOpen,
  onOpenGroup,
}: {
  community: CommunityMineRowData;
  apiOrigin: string;
  onOpen: (communityId: string) => void;
  onOpenGroup: (groupId: string) => void;
}) {
  const meta = communityListMetaLine(community);
  const archived = community.archivedAt != null;
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          community.name,
          meta,
          archived ? "Soft-archived" : null,
        ]
          .filter(Boolean)
          .join(", ")}
        onPress={() => onOpen(community.id)}
        style={({ pressed }) => ({
          minHeight: sizes.touchTarget + 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: spacing.surface,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar
          name={community.name}
          uri={mediaUrl(community.logoImageUrl, apiOrigin)}
          size="lg"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="lead" weight="semibold" numberOfLines={2}>
            {community.name}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={2}>
            {meta}
          </Text>
        </View>
        {archived ? (
          <Text size="eyebrow" tone="muted" mono uppercase>
            Soft-archived
          </Text>
        ) : null}
      </Pressable>
      {community.groups.length === 0 ? (
        <>
          <Hairline />
          <View style={{ padding: spacing.surface }}>
            <Text size="meta" tone="muted">
              {COMMUNITY_NO_GROUPS_COPY}
            </Text>
          </View>
        </>
      ) : (
        community.groups.map((group) => {
          const row = communityClubGroupRow(group);
          return (
            <View key={row.id}>
              <Hairline />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={row.accessibilityLabel}
                onPress={() => onOpenGroup(row.id)}
                style={({ pressed }) => ({
                  minHeight: sizes.touchTarget + 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: spacing.surface,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Avatar
                  name={row.name}
                  uri={mediaUrl(row.imageUrl, apiOrigin)}
                  size="default"
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="medium" numberOfLines={2}>
                    {row.name}
                  </Text>
                  <Text size="meta" tone="muted" numberOfLines={1}>
                    {row.meta}
                  </Text>
                </View>
                {row.joined ? (
                  <Text size="eyebrow" tone="muted" mono uppercase>
                    Joined
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        })
      )}
    </Surface>
  );
}

function StartCard({ onCreate }: { onCreate: () => void }) {
  return (
    <Surface style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {COMMUNITY_START_COPY.title}
      </Text>
      <Text size="meta" tone="muted">
        {COMMUNITY_START_COPY.description}
      </Text>
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        <Button label={COMMUNITY_START_COPY.action} onPress={onCreate} />
      </View>
    </Surface>
  );
}

export function CommunitiesView(props: CommunitiesViewProps) {
  const { communities } = props;
  return (
    <View style={{ gap: spacing.compact }}>
      <Text size="h1" weight="bold" accessibilityRole="header">
        {COMMUNITIES_TITLE}
      </Text>
      {communities.status === "loading" ? (
        <View style={{ gap: 12 }} accessibilityLabel="Loading Communities">
          {[0, 1].map((key) => (
            <Skeleton key={key} height={140} radius={16} />
          ))}
        </View>
      ) : null}
      {communities.status === "error" ? (
        <Notice
          alert
          title={COMMUNITIES_ERROR_TITLE}
          description={communities.message}
          onRetry={props.onRetry}
        />
      ) : null}
      {communities.status === "ready"
        ? communities.value.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              apiOrigin={props.apiOrigin}
              onOpen={props.onOpen}
              onOpenGroup={props.onOpenGroup}
            />
          ))
        : null}
      {communities.status === "ready" ? (
        <StartCard onCreate={props.onCreate} />
      ) : null}
    </View>
  );
}
