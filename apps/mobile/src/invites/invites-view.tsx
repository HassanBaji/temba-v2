import { spacing } from "@repo/design-tokens";
import { gameInviteSeatCopy, type InviteInboxItem } from "@repo/domain/invites";
import { groupLinkRequestRowTitle } from "@repo/domain/group-link-request";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import type { GroupLinkRequestRow } from "../groups/use-group-link-request";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
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
  const m = useMessages();
  const locale = useLocale();
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
          {m.invite.kind[item.kind]}
        </Text>
      </View>
      {seatPick ? (
        <View style={{ gap: 8 }}>
          <Text size="meta" tone="muted">
            {gameInviteSeatCopy(seatPick, "inbox", locale)}
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
                label={m.invite.inbox.joinWaitlistLabel}
                accessibilityLabel={m.mobileCommunity.invites.joinWaitlistA11y(
                  item.title,
                )}
                pending={pending}
                onPress={onAccept}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={m.invite.inbox.acceptLabel}
            accessibilityLabel={m.mobileCommunity.invites.acceptInviteA11y(
              item.title,
            )}
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
  const m = useMessages();
  const locale = useLocale();
  return (
    <View style={{ padding: spacing.surface, gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text size="lead" weight="semibold" numberOfLines={3}>
          {groupLinkRequestRowTitle(
            request.venueName,
            request.groupName,
            locale,
          )}
        </Text>
        <Text size="meta" tone="muted">
          {m.group.linkRequest.rowMeta}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={m.group.linkRequest.declineLabel}
          accessibilityLabel={m.mobileCommunity.invites.declineRequestA11y(
            request.venueName,
          )}
          variant="outline"
          disabled={pending}
          onPress={onDecline}
        />
        <Button
          label={m.group.linkRequest.acceptLabel}
          accessibilityLabel={m.mobileCommunity.invites.reviewRequestA11y(
            request.venueName,
          )}
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
  const m = useMessages();
  if (requests.length === 0) {
    return null;
  }
  return (
    <Section title={m.group.linkRequest.venueRequestsTitle}>
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
  const m = useMessages();
  if (inbox.status === "loading") {
    return (
      <View
        style={{ gap: 12 }}
        accessibilityLabel={m.mobileCommunity.invites.loadingA11y}
      >
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
        title={m.invite.inbox.errorTitle}
        description={inbox.message}
        onRetry={onRetry}
      />
    );
  }
  if (inbox.value.length === 0) {
    return hasVenueRequests ? null : <Notice {...m.invite.inbox.empty} />;
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
  const m = useMessages();
  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <ScreenHeader nav="back" fallback="/profile" title={m.common.invites} />
        <Text size="meta" tone="muted">
          {m.mobileCommunity.invites.description}
        </Text>
      </View>
      <Inbox {...props} hasVenueRequests={props.venueRequests.length > 0} />
      <VenueRequests
        requests={props.venueRequests}
        pendingId={props.venueRequestPendingId}
        onAccept={props.onAcceptVenueRequest}
        onDecline={props.onDeclineVenueRequest}
      />
      <Section title={m.mobileCommunity.invites.linkSectionTitle}>
        <Surface style={{ gap: 12 }}>
          <TextField
            label={m.mobileCommunity.invites.linkLabel}
            value={props.linkText}
            onChangeText={props.onLinkTextChange}
            error={props.linkError ?? undefined}
            placeholder={m.mobileCommunity.invites.linkPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={props.onOpenLink}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label={m.mobileCommunity.invites.paste}
              variant="outline"
              onPress={props.onPasteLink}
            />
            <Button
              label={m.mobileCommunity.invites.openLink}
              disabled={props.linkText.trim().length === 0}
              onPress={props.onOpenLink}
            />
          </View>
        </Surface>
      </Section>
    </View>
  );
}
