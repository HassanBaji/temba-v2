import { radii, sizes } from "@repo/design-tokens";
import {
  createVenueCopy,
  venueCardMeta,
  visibleCreateGroups,
  type CreateVenuePicker,
} from "@repo/domain/create-game-flow";
import { Lock, Search } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import type { Slot } from "../home/home-model";
import { ChoiceCard } from "../primitives/choice-card";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Skeleton } from "../primitives/skeleton";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { FieldError } from "./chips";
import { StepSection } from "./step-section";

const SEARCH_FIELD_HEIGHT = 46;
const SKELETON_ROWS = 2;
const LIST_ROW_PADDING = { paddingVertical: 16, paddingHorizontal: 18 };

export function VenueField({
  groupId,
  picker,
  venueId,
  manyCourts,
  error,
  onSelect,
}: {
  groupId: string;
  picker: Slot<CreateVenuePicker> | null;
  venueId: string;
  manyCourts: boolean;
  error?: string;
  onSelect: (venueId: string) => void;
}) {
  const ready = picker?.status === "ready" ? picker.value : null;
  const unlocked = ready !== null && !ready.locked && ready.venues.length > 0;

  return (
    <StepSection
      title="Venue"
      locked={!groupId}
      note={unlocked ? "Required" : undefined}
    >
      {!groupId ? (
        <LockedPanel />
      ) : picker === null || picker.status === "loading" ? (
        <LoadingRows />
      ) : picker.status === "error" ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {picker.message}
        </Text>
      ) : picker.value.locked ? (
        <LinkedVenue picker={picker.value} manyCourts={manyCourts} />
      ) : picker.value.venues.length === 0 ? (
        <Text size="meta" weight="medium">
          No Venues are available yet.
        </Text>
      ) : (
        <>
          <SearchFieldButton />
          <VenueList
            venues={visibleCreateGroups(picker.value.venues, venueId)}
            venueId={venueId}
            onSelect={onSelect}
          />
          <Text size="meta" tone="muted">
            {createVenueCopy(picker.value, { manyCourts })}
          </Text>
        </>
      )}
      <FieldError message={error} />
    </StepSection>
  );
}

function ListFrame({ children, ...props }: React.ComponentProps<typeof View>) {
  const palette = useTonePalette();
  return (
    <View
      {...props}
      style={{
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: palette.rule,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function LockedPanel() {
  const palette = useTonePalette();
  return (
    <View
      style={{
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 18,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      <Hatch radius={radii.card} />
      <Lock size={sizes.iconRow} color={palette.muted} />
      <Text size="meta" tone="muted" style={{ flex: 1 }}>
        Pick a Group first. Venue rules depend on the Group.
      </Text>
    </View>
  );
}

function LoadingRows() {
  return (
    <ListFrame
      accessibilityLabel="Loading Venues"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Fragment key={index}>
          {index > 0 ? <Hairline /> : null}
          <View style={{ ...LIST_ROW_PADDING, gap: 6 }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={14} />
          </View>
        </Fragment>
      ))}
    </ListFrame>
  );
}

function LinkedVenue({
  picker,
  manyCourts,
}: {
  picker: CreateVenuePicker;
  manyCourts: boolean;
}) {
  const palette = useTonePalette();
  const venue = picker.venues[0];
  const meta = venue ? venueCardMeta(venue.courts.length, venue.city) : null;
  return (
    <>
      {venue ? (
        <ListFrame
          accessible
          accessibilityLabel={`${venue.name}, ${meta}`}
          accessibilityState={{ selected: true, disabled: true }}
        >
          <View
            style={{
              ...LIST_ROW_PADDING,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="semibold" numberOfLines={1}>
                {venue.name}
              </Text>
              <Text size="meta" tone="muted">
                {meta}
              </Text>
            </View>
            <Lock size={sizes.iconRow} color={palette.muted} />
          </View>
        </ListFrame>
      ) : null}
      <Text size="meta" tone="muted">
        {createVenueCopy(picker, { manyCourts })}
      </Text>
    </>
  );
}

function SearchFieldButton() {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search all Venues"
      accessibilityState={{ disabled: true }}
      disabled
      style={{
        height: SEARCH_FIELD_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: palette.rule,
        backgroundColor: palette.wash,
      }}
    >
      <Search size={sizes.iconRow} color={palette.muted} />
      <Text tone="muted">Search all Venues</Text>
    </Pressable>
  );
}

function VenueList({
  venues,
  venueId,
  onSelect,
}: {
  venues: CreateVenuePicker["venues"];
  venueId: string;
  onSelect: (venueId: string) => void;
}) {
  return (
    <ListFrame accessibilityRole="radiogroup" accessibilityLabel="Venue">
      {venues.map((venue, index) => (
        <Fragment key={venue.id}>
          {index > 0 ? <Hairline /> : null}
          <ChoiceCard
            role="radio"
            variant="row"
            trailing="check"
            selected={venue.id === venueId}
            title={venue.name}
            description={venueCardMeta(venue.courts.length, venue.city)}
            onPress={() => onSelect(venue.id)}
          />
        </Fragment>
      ))}
    </ListFrame>
  );
}
