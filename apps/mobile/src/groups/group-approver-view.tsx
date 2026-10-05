import { spacing } from "@repo/design-tokens";
import type { GroupJoinRequestData } from "@repo/domain/group-data";
import {
  GROUP_REQUIRE_APPROVAL_HELP,
  GROUP_REQUIRE_APPROVAL_LABEL,
  GROUP_REQUESTS_DESCRIPTION,
  GROUP_REQUESTS_EMPTY,
  GROUP_REQUESTS_ERROR_TITLE,
  GROUP_REQUESTS_TITLE,
  groupJoinRequestMeta,
} from "@repo/domain/group-admin";
import { View } from "react-native";

import type { Slot } from "../home/home-model";
import { mediaUrl } from "../lib/media-url";
import { ToggleRow } from "../lib/toggle-row";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Section } from "../primitives/section";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { Notice } from "./notice";

export type GroupApproverProps = {
  canSetRequiresApproval: boolean;
  requiresApproval: boolean;
  requiresApprovalPending: boolean;
  onRequiresApprovalChange: (next: boolean) => void;
  canDecideJoinRequests: boolean;
  requests: Slot<GroupJoinRequestData[]>;
  approvePendingId: string | null;
  rejectPendingId: string | null;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onRetry: () => void;
  communityName: string | null;
  apiOrigin: string;
};

function RequestRow({
  request,
  communityName,
  apiOrigin,
  approving,
  rejecting,
  onApprove,
  onReject,
}: {
  request: GroupJoinRequestData;
  communityName: string | null;
  apiOrigin: string;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const name = request.user.name ?? "User";
  const meta = groupJoinRequestMeta(request, communityName);
  return (
    <View style={{ gap: 10, padding: spacing.surface }}>
      <View
        accessible
        accessibilityLabel={`${name}. ${meta}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <Avatar
          name={name}
          uri={mediaUrl(request.user.image, apiOrigin)}
          size="lg"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={2}>
            {meta}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label="Approve"
          accessibilityLabel={`Approve ${name}`}
          pending={approving}
          disabled={rejecting}
          onPress={onApprove}
        />
        <Button
          label="Reject"
          accessibilityLabel={`Reject ${name}`}
          variant="outline"
          pending={rejecting}
          disabled={approving}
          onPress={onReject}
        />
      </View>
    </View>
  );
}

function Requests(props: GroupApproverProps) {
  const { requests } = props;
  if (requests.status === "loading") {
    return <Skeleton height={96} radius={16} />;
  }
  if (requests.status === "error") {
    return (
      <Notice
        alert
        title={GROUP_REQUESTS_ERROR_TITLE}
        description={requests.message}
        onRetry={props.onRetry}
      />
    );
  }
  if (requests.value.length === 0) {
    return <Notice {...GROUP_REQUESTS_EMPTY} />;
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {requests.value.map((request, index) => (
        <View key={request.id}>
          {index > 0 ? <Hairline /> : null}
          <RequestRow
            request={request}
            communityName={props.communityName}
            apiOrigin={props.apiOrigin}
            approving={props.approvePendingId === request.id}
            rejecting={props.rejectPendingId === request.id}
            onApprove={() => props.onApprove(request.id)}
            onReject={() => props.onReject(request.id)}
          />
        </View>
      ))}
    </Surface>
  );
}

export function GroupApproverView(props: GroupApproverProps) {
  if (!props.canSetRequiresApproval && !props.canDecideJoinRequests) {
    return null;
  }
  return (
    <View style={{ gap: spacing.compact }}>
      {props.canSetRequiresApproval ? (
        <ToggleRow
          label={GROUP_REQUIRE_APPROVAL_LABEL}
          help={GROUP_REQUIRE_APPROVAL_HELP}
          value={props.requiresApproval}
          onChange={props.onRequiresApprovalChange}
          disabled={props.requiresApprovalPending}
        />
      ) : null}
      {props.canDecideJoinRequests ? (
        <Section title={GROUP_REQUESTS_TITLE}>
          <Text size="meta" tone="muted">
            {GROUP_REQUESTS_DESCRIPTION}
          </Text>
          <Requests {...props} />
        </Section>
      ) : null}
    </View>
  );
}
