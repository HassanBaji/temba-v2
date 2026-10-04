import { spacing } from "@repo/design-tokens";
import {
  COMMUNITY_JOIN_REQUESTS_ERROR_TITLE,
  COMMUNITY_JOIN_REQUESTS_TITLE,
  COMMUNITY_REQUESTS_EMPTY,
  COMMUNITY_TEAM_LINK_REQUESTS_ERROR_TITLE,
  COMMUNITY_TEAM_LINK_REQUESTS_TITLE,
  communityJoinRequestRow,
  communityRequestsAreEmpty,
  communityTeamLinkRequestRow,
} from "@repo/domain/community";
import type {
  CommunityJoinRequestData,
  CommunityTeamLinkRequestData,
} from "@repo/domain/community-data";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Section } from "../primitives/section";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export type CommunityRequestsViewProps = {
  canManageJoinRequests: boolean;
  canManageTeamLinks: boolean;
  joinRequests: Slot<CommunityJoinRequestData[]>;
  teamLinkRequests: Slot<CommunityTeamLinkRequestData[]>;
  apiOrigin: string;
  approveJoinPendingId: string | null;
  rejectJoinPendingId: string | null;
  approveTeamPendingId: string | null;
  rejectTeamPendingId: string | null;
  onApproveJoin: (requestId: string) => void;
  onRejectJoin: (requestId: string) => void;
  onApproveTeam: (requestId: string) => void;
  onRejectTeam: (requestId: string) => void;
  onRetryJoin: () => void;
  onRetryTeam: () => void;
};

function RequestRow({
  title,
  meta,
  image,
  showAvatar,
  apiOrigin,
  approving,
  rejecting,
  onApprove,
  onReject,
}: {
  title: string;
  meta: string;
  image: string | null;
  showAvatar: boolean;
  apiOrigin: string;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={{ gap: 10, padding: spacing.surface }}>
      <View
        accessible
        accessibilityLabel={`${title}. ${meta}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        {showAvatar ? (
          <Avatar name={title} uri={mediaUrl(image, apiOrigin)} size="lg" />
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={2}>
            {title}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={2}>
            {meta}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label="Approve"
          accessibilityLabel={`Approve ${title}`}
          pending={approving}
          disabled={rejecting}
          onPress={onApprove}
        />
        <Button
          label="Reject"
          accessibilityLabel={`Reject ${title}`}
          variant="outline"
          pending={rejecting}
          disabled={approving}
          onPress={onReject}
        />
      </View>
    </View>
  );
}

function RequestList<T extends { id: string }>({
  slot,
  errorTitle,
  onRetry,
  renderRow,
}: {
  slot: Slot<T[]>;
  errorTitle: string;
  onRetry: () => void;
  renderRow: (request: T) => React.ReactNode;
}) {
  if (slot.status === "loading") {
    return <Skeleton height={96} radius={16} />;
  }
  if (slot.status === "error") {
    return (
      <Notice
        alert
        title={errorTitle}
        description={slot.message}
        onRetry={onRetry}
      />
    );
  }
  if (slot.value.length === 0) {
    return null;
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {slot.value.map((request, index) => (
        <View key={request.id}>
          {index > 0 ? <Hairline /> : null}
          {renderRow(request)}
        </View>
      ))}
    </Surface>
  );
}

function countOf<T>(slot: Slot<T[]>) {
  return slot.status === "ready" ? slot.value.length : undefined;
}

export function CommunityRequestsView(props: CommunityRequestsViewProps) {
  const empty = communityRequestsAreEmpty({
    canManageJoinRequests: props.canManageJoinRequests,
    canManageTeamLinks: props.canManageTeamLinks,
    joinCount: countOf(props.joinRequests),
    teamCount: countOf(props.teamLinkRequests),
    loading:
      (props.canManageJoinRequests &&
        props.joinRequests.status === "loading") ||
      (props.canManageTeamLinks && props.teamLinkRequests.status === "loading"),
    failed:
      (props.canManageJoinRequests && props.joinRequests.status === "error") ||
      (props.canManageTeamLinks && props.teamLinkRequests.status === "error"),
  });
  if (empty) {
    return <Notice {...COMMUNITY_REQUESTS_EMPTY} />;
  }
  return (
    <View style={{ gap: spacing.section }}>
      {props.canManageJoinRequests ? (
        <Section title={COMMUNITY_JOIN_REQUESTS_TITLE}>
          <RequestList
            slot={props.joinRequests}
            errorTitle={COMMUNITY_JOIN_REQUESTS_ERROR_TITLE}
            onRetry={props.onRetryJoin}
            renderRow={(request) => {
              const row = communityJoinRequestRow(request);
              return (
                <RequestRow
                  title={row.title}
                  meta={row.meta}
                  image={row.image}
                  showAvatar
                  apiOrigin={props.apiOrigin}
                  approving={props.approveJoinPendingId === request.id}
                  rejecting={props.rejectJoinPendingId === request.id}
                  onApprove={() => props.onApproveJoin(request.id)}
                  onReject={() => props.onRejectJoin(request.id)}
                />
              );
            }}
          />
        </Section>
      ) : null}
      {props.canManageTeamLinks ? (
        <Section title={COMMUNITY_TEAM_LINK_REQUESTS_TITLE}>
          <RequestList
            slot={props.teamLinkRequests}
            errorTitle={COMMUNITY_TEAM_LINK_REQUESTS_ERROR_TITLE}
            onRetry={props.onRetryTeam}
            renderRow={(request) => {
              const row = communityTeamLinkRequestRow(request);
              return (
                <RequestRow
                  title={row.title}
                  meta={row.meta}
                  image={null}
                  showAvatar={false}
                  apiOrigin={props.apiOrigin}
                  approving={props.approveTeamPendingId === request.id}
                  rejecting={props.rejectTeamPendingId === request.id}
                  onApprove={() => props.onApproveTeam(request.id)}
                  onReject={() => props.onRejectTeam(request.id)}
                />
              );
            }}
          />
        </Section>
      ) : null}
    </View>
  );
}
