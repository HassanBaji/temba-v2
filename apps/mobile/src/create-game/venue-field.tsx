import { radii, sizes } from "@repo/design-tokens";
import {
  createVenueCopy,
  venueCardMeta,
  venueMatchesQuery,
  visibleCreateGroups,
  type CreateVenuePicker,
} from "@repo/domain/create-game-flow";
import type { Sport } from "@repo/domain/sport";
import { Lock, Search } from "lucide-react-native";
import { Fragment, useState } from "react";
import { Pressable, View } from "react-native";

import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { ChoiceCard } from "../primitives/choice-card";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Skeleton } from "../primitives/skeleton";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { FieldError } from "./chips";
import { SearchSheet } from "./search-sheet";
import { StepSection } from "./step-section";
import { venueSheetLabel } from "./venue-sheet";

const SEARCH_FIELD_HEIGHT = 46;
const SKELETON_ROWS = 2;
const LIST_ROW_PADDING = { paddingVertical: 16, paddingHorizontal: 18 };

export function VenueField({
  groupId,
  picker,
  venueId,
  manyCourts,
  sport,
  error,
  initialSheetQuery,
  onSelect,
}: {
  groupId: string;
  picker: Slot<CreateVenuePicker> | null;
  venueId: string;
  manyCourts: boolean;
  sport: Sport;
  error?: string;
  initialSheetQuery?: string;
  onSelect: (venueId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const [sheetOpen, setSheetOpen] = useState(initialSheetQuery !== undefined);
  const ready = picker?.status === "ready" ? picker.value : null;
  const unlocked = ready !== null && !ready.locked && ready.venues.length > 0;

  return (
    <StepSection
      title={m.mobileCreateGame.venue.title}
      locked={!groupId}
      note={unlocked ? m.common.required : undefined}
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
        <LinkedVenue
          picker={picker.value}
          manyCourts={manyCourts}
          sport={sport}
        />
      ) : picker.value.venues.length === 0 ? (
        <Text size="meta" weight="medium">
          {m.mobileCreateGame.venue.noneYet}
        </Text>
      ) : (
        <>
          <SearchFieldButton onPress={() => setSheetOpen(true)} />
          <VenueSheet
            visible={sheetOpen}
            venues={picker.value.venues}
            venueId={venueId}
            sport={sport}
            initialQuery={initialSheetQuery}
            onSelect={onSelect}
            onClose={() => setSheetOpen(false)}
          />
          <VenueList
            venues={visibleCreateGroups(picker.value.venues, venueId)}
            venueId={venueId}
            sport={sport}
            onSelect={onSelect}
          />
          <Text size="meta" tone="muted">
            {createVenueCopy(picker.value, locale, { manyCourts, sport })}
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
  const copy = useMessages().mobileCreateGame.venue;
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
        {copy.lockedNote}
      </Text>
    </View>
  );
}

function LoadingRows() {
  const copy = useMessages().mobileCreateGame.venue;
  return (
    <ListFrame
      accessibilityLabel={copy.loading}
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
  sport,
}: {
  picker: CreateVenuePicker;
  manyCourts: boolean;
  sport: Sport;
}) {
  const palette = useTonePalette();
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.venue;
  const venue = picker.venues[0];
  const meta = venue
    ? venueCardMeta(venue.courts.length, venue.city, locale, sport)
    : null;
  return (
    <>
      {venue ? (
        <ListFrame
          accessible
          accessibilityLabel={copy.linkedA11y(venue.name, meta ?? "")}
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
        {createVenueCopy(picker, locale, { manyCourts, sport })}
      </Text>
    </>
  );
}

function SearchFieldButton({ onPress }: { onPress: () => void }) {
  const palette = useTonePalette();
  const copy = useMessages().mobileCreateGame.venue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.searchAll}
      onPress={onPress}
      style={({ pressed }) => ({
        height: SEARCH_FIELD_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: pressed ? palette.foreground : palette.rule,
        backgroundColor: palette.wash,
      })}
    >
      <Search size={sizes.iconRow} color={palette.muted} />
      <Text tone="muted">{copy.searchAll}</Text>
    </Pressable>
  );
}

function VenueList({
  venues,
  venueId,
  sport,
  onSelect,
}: {
  venues: CreateVenuePicker["venues"];
  venueId: string;
  sport: Sport;
  onSelect: (venueId: string) => void;
}) {
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.venue;
  return (
    <ListFrame accessibilityRole="radiogroup" accessibilityLabel={copy.title}>
      {venues.map((venue, index) => (
        <Fragment key={venue.id}>
          {index > 0 ? <Hairline /> : null}
          <ChoiceCard
            role="radio"
            variant="row"
            trailing="check"
            selected={venue.id === venueId}
            title={venue.name}
            description={venueCardMeta(
              venue.courts.length,
              venue.city,
              locale,
              sport,
            )}
            onPress={() => onSelect(venue.id)}
          />
        </Fragment>
      ))}
    </ListFrame>
  );
}

function VenueSheet({
  visible,
  venues,
  venueId,
  sport,
  initialQuery,
  onSelect,
  onClose,
}: {
  visible: boolean;
  venues: CreateVenuePicker["venues"];
  venueId: string;
  sport: Sport;
  initialQuery?: string;
  onSelect: (venueId: string) => void;
  onClose: () => void;
}) {
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.venue;
  return (
    <SearchSheet
      visible={visible}
      title={copy.find}
      placeholder={copy.searchPlaceholder}
      listLabel={copy.title}
      initialQuery={initialQuery}
      selectedId={venueId}
      filter={(query) =>
        venues
          .filter((venue) => venueMatchesQuery(venue, query))
          .map((venue) => ({
            id: venue.id,
            title: venue.name,
            description: venueCardMeta(
              venue.courts.length,
              venue.city,
              locale,
              sport,
            ),
          }))
      }
      resultLabel={(query, count) => venueSheetLabel(query, count, locale)}
      emptyMessage={copy.noMatch}
      onPick={onSelect}
      onClose={onClose}
    />
  );
}
