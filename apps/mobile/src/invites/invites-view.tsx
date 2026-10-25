import { spacing } from "@repo/design-tokens";
import {
  INVITES_EMPTY_COPY,
  INVITES_ERROR_TITLE,
  INVITE_ACCEPT_LABEL,
  INVITE_JOIN_WAITLIST_LABEL,
  gameInviteSeatCopy,
  inviteKindLabel,
  type InviteInboxItem,
} from "@repo/domain/invites";
import {
  GROUP_LINK_REQUEST_ACCEPT_LABEL,
  GROUP_LINK_REQUEST_DECLINE_LABEL,
  GROUP_LINK_REQUEST_ROW_META,
  VENUE_REQUESTS_TITLE,
  groupLinkRequestRowTitle,
} from "@repo/domain/group-link-request";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import type { GroupLinkRequestRow } from "../groups/use-group-link-request";
import type { Slot } from "../home/home-model";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ScreenHeader } from "../primitives/screen-header";
import { Section } from "../primitives/section";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { SeatChoice } from "./seat-choice";

export type InvitesViewProps = {
  inbox: Slot<InviteInboxItem[]>;
  venueRequests: GroupLinkRequestRow[];
  venueRequestPendingId: string | null;
  onAcceptVenueRequest: (request: GroupLinkRequestRow) => void;
  onDeclineVenueRequest: (request: GroupLinkRequestRow) => void;
  pendingKey: string | null;
  onAccept: (item: InviteInboxItem) => void;
  onPickSeat: (
    item: InviteInboxItem,
    sideIndex: number,
    position: "left" | "right",
  ) => void;
  onRetry: () => void;
  linkText: string;
  linkError: string | null;
  onLinkTextChange: (text: string) => void;
  onPasteLink: () => void;
  onOpenLink: () => void;
};

function InviteRow({
  item,
  pending,
  onAccept,
  onPickSeat,
}: {
  item: InviteInboxItem;
  pending: boolean;
  onAccept: () => void;
  onPickSeat: InvitesViewProps["onPickSeat"];
}) {
  const seatPick = item.seatPick;
  return (
    <View style={{ padding: spacing.surface, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={item.inviterName} uri={item.inviterImage} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="lead" weight="semibold" numberOfLines={2}>
            {item.title}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={2}>
            {item.meta}
          </Text>
        </View>
        <Text size="eyebrow" tone="muted" mono uppercase>
          {inviteKindLabel(item.kind)}
        </Text>
      </View>
      {seatPick ? (
        <View style={{ gap: 8 }}>
          <Text size="meta" tone="muted">
            {gameInviteSeatCopy(seatPick, "inbox")}
          </Text>
          <SeatChoice
            sides={seatPick.sides}
            canPick={!seatPick.joinFrozen && !seatPick.waitlistOnly}
            pending={pending}
            onPick={(sideIndex, position) =>
              onPickSeat(item, sideIndex, position)
            }
          />
          {seatPick.waitlistOnly ? (
            <View style={{ flexDirection: "row" }}>
              <Button
                label={INVITE_JOIN_WAITLIST_LABEL}
                accessibilityLabel={`${INVITE_JOIN_WAITLIST_LABEL} for ${item.title}`}
                pending={pending}
                onPress={onAccept}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={INVITE_ACCEPT_LABEL}
            accessibilityLabel={`Accept the invite to ${item.title}`}
            pending={pending}
            onPress={onAccept}
          />
        </View>
      )}
    </View>
  );
}

function VenueRequestRow({
  request,
  pending,
  onAccept,
  onDecline,
}: {
  request: GroupLinkRequestRow;
  pending: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={{ padding: spacing.surface, gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text size="lead" weight="semibold" numberOfLines={3}>
          {groupLinkRequestRowTitle(request.venueName, request.groupName)}
        </Text>
        <Text size="meta" tone="muted">
          {GROUP_LINK_REQUEST_ROW_META}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={GROUP_LINK_REQUEST_DECLINE_LABEL}
          accessibilityLabel={`Decline the request from ${request.venueName}`}
          variant="outline"
          disabled={pending}
          onPress={onDecline}
        />
        <Button
          label={GROUP_LINK_REQUEST_ACCEPT_LABEL}
          accessibilityLabel={`Review the request from ${request.venueName}`}
          pending={pending}
          onPress={onAccept}
        />
      </View>
    </View>
  );
}

function VenueRequests({
  requests,
  pendingId,
  onAccept,
  onDecline,
}: {
  requests: GroupLinkRequestRow[];
  pendingId: string | null;
  onAccept: (request: GroupLinkRequestRow) => void;
  onDecline: (request: GroupLinkRequestRow) => void;
}) {
  if (requests.length === 0) {
    return null;
  }
  return (
    <Section title={VENUE_REQUESTS_TITLE}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {requests.map((request, index) => (
          <View key={request.id}>
            {index > 0 ? <Hairline /> : null}
            <VenueRequestRow
              request={request}
              pending={pendingId === request.id}
              onAccept={() => onAccept(request)}
              onDecline={() => onDecline(request)}
            />
          </View>
        ))}
      </Surface>
    </Section>
  );
}

function Inbox({
  inbox,
  hasVenueRequests,
  pendingKey,
  onAccept,
  onPickSeat,
  onRetry,
}: Pick<
  InvitesViewProps,
  "inbox" | "pendingKey" | "onAccept" | "onPickSeat" | "onRetry"
> & { hasVenueRequests: boolean }) {
  if (inbox.status === "loading") {
    return (
      <View style={{ gap: 12 }} accessibilityLabel="Loading invites">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} height={88} radius={16} />
        ))}
      </View>
    );
  }
  if (inbox.status === "error") {
    return (
      <Notice
        alert
        title={INVITES_ERROR_TITLE}
        description={inbox.message}
        onRetry={onRetry}
      />
    );
  }
  if (inbox.value.length === 0) {
    return hasVenueRequests ? null : <Notice {...INVITES_EMPTY_COPY} />;
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {inbox.value.map((item, index) => (
        <View key={item.key}>
          {index > 0 ? <Hairline /> : null}
          <InviteRow
            item={item}
            pending={pendingKey === item.key}
            onAccept={() => onAccept(item)}
            onPickSeat={onPickSeat}
          />
        </View>
      ))}
    </Surface>
  );
}

export function InvitesView(props: InvitesViewProps) {
  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <ScreenHeader nav="back" fallback="/profile" title="Invites" />
        <Text size="meta" tone="muted">
          Invites sent to you. Accept one to join.
        </Text>
      </View>
      <Inbox {...props} hasVenueRequests={props.venueRequests.length > 0} />
      <VenueRequests
        requests={props.venueRequests}
        pendingId={props.venueRequestPendingId}
        onAccept={props.onAcceptVenueRequest}
        onDecline={props.onDeclineVenueRequest}
      />
      <Section title="Have an Invite link?">
        <Surface style={{ gap: 12 }}>
          <TextField
            label="Invite link"
            value={props.linkText}
            onChangeText={props.onLinkTextChange}
            error={props.linkError ?? undefined}
            placeholder="Paste the link you were sent"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={props.onOpenLink}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label="Paste"
              variant="outline"
              onPress={props.onPasteLink}
            />
            <Button
              label="Open link"
              disabled={props.linkText.trim().length === 0}
              onPress={props.onOpenLink}
            />
          </View>
        </Surface>
      </Section>
    </View>
  );
}
