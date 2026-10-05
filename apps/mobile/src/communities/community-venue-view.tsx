import { spacing } from "@repo/design-tokens";
import {
  COMMUNITY_LINK_VENUE_COPY,
  COMMUNITY_LINK_VENUE_LABEL,
  COMMUNITY_NO_COURTS_COPY,
  COMMUNITY_NO_VENUE_COPY,
  COMMUNITY_UNLINK_VENUE_LABEL,
  communityLiveVenueRow,
  communityVenueView,
} from "@repo/domain/community";
import type {
  CommunityHomeData,
  CommunityLiveVenueData,
} from "@repo/domain/community-data";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export function CommunityVenueBlock({
  data,
  apiOrigin,
  onLink,
  onUnlink,
}: {
  data: CommunityHomeData;
  apiOrigin: string;
  onLink: () => void;
  onUnlink: () => void;
}) {
  const view = communityVenueView(data);
  const { venue } = view;
  return (
    <Surface style={{ gap: spacing.compact - 4 }}>
      <Text
        size="eyebrow"
        tone="muted"
        mono
        uppercase
        accessibilityRole="header"
      >
        Venue
      </Text>
      {venue ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar
              name={venue.name}
              uri={mediaUrl(venue.logoImageUrl, apiOrigin)}
              size="lg"
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={2}>
                {venue.name}
              </Text>
              <Text size="meta" tone="muted" numberOfLines={1}>
                {view.location}
              </Text>
              {venue.archivedAt ? (
                <Text size="eyebrow" tone="muted" mono uppercase>
                  Venue Soft-archived
                </Text>
              ) : null}
            </View>
          </View>
          {view.courtNames.length === 0 ? (
            <Text size="meta" tone="muted">
              {COMMUNITY_NO_COURTS_COPY}
            </Text>
          ) : (
            <Text size="meta" tone="muted">
              {view.courtNames.join(" · ")}
            </Text>
          )}
        </View>
      ) : (
        <Text tone="muted">{COMMUNITY_NO_VENUE_COPY}</Text>
      )}
      {view.notes.map((note) => (
        <Text key={note} size="meta" tone="muted">
          {note}
        </Text>
      ))}
      {view.canRequestLink || view.canUnlink ? (
        <View style={{ flexDirection: "row" }}>
          {view.canRequestLink ? (
            <Button label={COMMUNITY_LINK_VENUE_LABEL} onPress={onLink} />
          ) : null}
          {view.canUnlink ? (
            <Button
              label={COMMUNITY_UNLINK_VENUE_LABEL}
              variant="outline"
              onPress={onUnlink}
            />
          ) : null}
        </View>
      ) : null}
    </Surface>
  );
}

export type VenueLinkSheetProps = {
  visible: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  venues: Slot<CommunityLiveVenueData[]>;
  pendingVenueId: string | null;
  onRequest: (venueId: string) => void;
  onRetry: () => void;
};

export function VenueLinkSheet(props: VenueLinkSheetProps) {
  const { venues } = props;
  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      title={COMMUNITY_LINK_VENUE_COPY.title}
    >
      <Text size="meta" tone="muted">
        {COMMUNITY_LINK_VENUE_COPY.description}
      </Text>
      <TextField
        label={COMMUNITY_LINK_VENUE_COPY.searchLabel}
        value={props.query}
        onChangeText={props.onQueryChange}
        autoCorrect={false}
        returnKeyType="search"
      />
      {venues.status === "loading" ? (
        <Skeleton height={64} radius={12} />
      ) : null}
      {venues.status === "error" ? (
        <Notice
          alert
          title={COMMUNITY_LINK_VENUE_COPY.errorTitle}
          description={venues.message}
          onRetry={props.onRetry}
        />
      ) : null}
      {venues.status === "ready" && venues.value.length === 0 ? (
        <Text tone="muted">{COMMUNITY_LINK_VENUE_COPY.none}</Text>
      ) : null}
      {venues.status === "ready" && venues.value.length > 0 ? (
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {venues.value.map((venue, index) => {
            const row = communityLiveVenueRow(venue);
            return (
              <View key={row.id}>
                {index > 0 ? <Hairline /> : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: spacing.surface,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="semibold" numberOfLines={2}>
                      {row.name}
                    </Text>
                    <Text size="meta" tone="muted" numberOfLines={1}>
                      {row.location}
                    </Text>
                  </View>
                  <Button
                    label={COMMUNITY_LINK_VENUE_COPY.requestLabel}
                    accessibilityLabel={row.accessibilityLabel}
                    variant="outline"
                    disabled={props.pendingVenueId !== null}
                    pending={props.pendingVenueId === row.id}
                    onPress={() => props.onRequest(row.id)}
                  />
                </View>
              </View>
            );
          })}
        </Surface>
      ) : null}
    </Sheet>
  );
}
