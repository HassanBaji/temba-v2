import type { Sport } from "@repo/domain/sport";
import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { venuePageImage } from "@repo/domain/venue-photos";
import { useRouter } from "expo-router";
import { ArrowRight, Info } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNow } from "../games/use-now";
import { apiOrigin } from "../lib/api-origin-runtime";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { api, type RouterOutputs } from "../trpc/react";
import { DetailRow, Notice, Pill, SectionHeading } from "./booking-parts";
import { checkoutPath, relativeDay, venueDetailsPath } from "./booking-model";
import { ChipGrid, ChipTile } from "./chip-grid";
import {
  courtChoices,
  dayStrip,
  durationChoices,
  keepOrFirst,
  startTimeGroups,
  weekdayOf,
  type CourtChoice,
  type StartTime,
} from "./slot-grid";
import { VenueBanner } from "./venue-banner";
import { courtCountLabel, openToLabel } from "./venues-model";
import { courtCoachCopy, courtPlural, courtStepTitle } from "./book-sport";

type BookingVenue = RouterOutputs["bookings"]["venueForBooking"];

const BANNER_HEIGHT = 200;
const DAY_TILE_WIDTH = 62;
const DURATION_COLUMNS = 3;
const TIME_COLUMNS = 5;
const COURT_COLUMNS = 3;

export function VenueScreen({
  venueId,
  sport,
}: {
  venueId: string;
  sport: Sport;
}) {
  const router = useRouter();
  const now = useNow();
  const [refreshing, setRefreshing] = useState(false);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [pickedMinutes, setPickedMinutes] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [pickedCourt, setPickedCourt] = useState<string | null>(null);

  const venue = api.bookings.venueForBooking.useQuery(
    { venueId },
    { enabled: Boolean(venueId) },
  );
  const days = venue.data ? dayStrip(now, venue.data.bookingHorizonDays) : [];
  const day = dayKey ?? days[0]?.key ?? null;
  const availability = api.bookings.venueAvailability.useQuery(
    { venueId, day: day ?? "", sport },
    { enabled: day !== null, refetchOnWindowFocus: "always" },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([venue.refetch(), availability.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [venue, availability]);

  if (!venue.data) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback="/book" />
        {venue.error ? (
          <Notice
            title={
              isNotFoundError(venue.error)
                ? "This venue is not taking bookings"
                : "The venue could not be loaded"
            }
            description={venue.error.message}
            actionLabel="Try again"
            onAction={() => void venue.refetch()}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={40} />
            <Skeleton height={72} />
            <Skeleton height={180} />
          </View>
        )}
      </Screen>
    );
  }

  const data = venue.data;
  const sportCourts = data.courts.filter((entry) => entry.sport === sport);
  const durations = availability.data
    ? durationChoices({
        options: data.durationOptionsMinutes,
        courts: availability.data.courts,
      })
    : data.durationOptionsMinutes.map((minutes) => ({
        minutes,
        offered: true,
      }));
  const minutes =
    keepOrFirst(
      pickedMinutes,
      durations.filter((entry) => entry.offered).map((entry) => entry.minutes),
    ) ?? keepOrFirst(pickedMinutes, data.durationOptionsMinutes);
  const groups =
    day && availability.data && minutes !== null
      ? startTimeGroups({
          dayKey: day,
          windows:
            data.openingHours.find((entry) => entry.weekday === weekdayOf(day))
              ?.windows ?? [],
          slotMinutes: data.slotMinutes,
          minutes,
          minLeadMinutes: data.minLeadMinutes,
          courts: availability.data.courts,
          now,
        })
      : null;
  const times = groups?.flatMap((group) => group.times) ?? [];
  const chosen =
    times.find(
      (time) => time.startsAt.getTime() === selected && time.freeCourts > 0,
    ) ?? null;
  const courts =
    chosen && availability.data && minutes !== null
      ? courtChoices({
          startsAt: chosen.startsAt,
          minutes,
          venueCourts: sportCourts,
          courts: availability.data.courts,
        })
      : [];
  const courtId = keepOrFirst(
    pickedCourt,
    courts.filter((court) => court.priceFils !== null).map((court) => court.id),
  );
  const court = courts.find((entry) => entry.id === courtId) ?? null;
  const todayWindows =
    data.openingHours.find(
      (entry) => days[0] && entry.weekday === weekdayOf(days[0].key),
    )?.windows ?? [];

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      bleedHeader
      header={<Banner venue={data} venueId={venueId} />}
      footer={
        <Footer
          chosen={chosen}
          court={court}
          minutes={minutes}
          now={now}
          onContinue={() =>
            chosen &&
            court &&
            minutes !== null &&
            router.push(
              checkoutPath(venueId, chosen.startsAt, minutes, court.id, sport),
            )
          }
        />
      }
    >
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Avatar
              name={data.name}
              uri={mediaUrl(data.logoImageUrl, apiOrigin)}
              size="lg"
            />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text size="h1" width="expanded" accessibilityRole="header">
              {data.name}
            </Text>
            <Text size="meta" tone="muted">
              {[data.city, data.country].filter(Boolean).join(", ")}
            </Text>
          </View>
        </View>
        {data.description ? <Text size="meta">{data.description}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pill label={courtCountLabel(sportCourts.length, sport)} />
          <Pill label={openToLabel(todayWindows)} />
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeading title="Day" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {days.map((entry) => {
            const isSelected = entry.key === day;
            return (
              <Pressable
                key={entry.key}
                accessibilityRole="button"
                accessibilityLabel={`${entry.weekday} ${entry.dayOfMonth}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  setDayKey(entry.key);
                  setSelected(null);
                }}
                style={({ pressed }) => ({
                  width: DAY_TILE_WIDTH,
                  paddingVertical: 8,
                  alignItems: "center",
                  borderRadius: radii.md,
                  borderWidth: hairline,
                  borderColor: isSelected ? colors.ink : colors.rule,
                  backgroundColor: isSelected ? colors.ink : colors.paper,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  size="eyebrow"
                  style={{ color: isSelected ? colors.dim : colors.muted }}
                >
                  {entry.weekday}
                </Text>
                <Text
                  size="title"
                  weight="bold"
                  style={{ color: isSelected ? colors.paper : colors.ink }}
                >
                  {String(entry.dayOfMonth)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeading title="Duration" />
        <ChipGrid columns={DURATION_COLUMNS}>
          {durations.map((entry) => (
            <ChipTile
              key={entry.minutes}
              label={`${entry.minutes} min`}
              struck={!entry.offered}
              selected={entry.minutes === minutes}
              onPress={() => setPickedMinutes(entry.minutes)}
            />
          ))}
        </ChipGrid>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeading title="Start time" />
        {availability.error ? (
          <Notice
            title="Times could not be loaded"
            description={availability.error.message}
            actionLabel="Try again"
            onAction={() => void availability.refetch()}
          />
        ) : groups === null ? (
          <Skeleton height={104} />
        ) : times.length === 0 ? (
          <Notice
            title="Nothing to book on this day"
            description="The venue is closed or every time has passed. Pick another day or duration."
          />
        ) : (
          <>
            {groups.map((group) => (
              <View
                key={`${group.label}-${group.times[0]?.label}`}
                style={{ gap: 8 }}
              >
                <Text size="eyebrow" mono uppercase tone="muted">
                  {group.label}
                </Text>
                <ChipGrid columns={TIME_COLUMNS}>
                  {group.times.map((time) => (
                    <ChipTile
                      key={time.startsAt.getTime()}
                      label={time.label}
                      accessibilityLabel={`${formatGameClock(time.startsAt)}${time.freeCourts === 0 ? ", unavailable" : ""}`}
                      struck={time.freeCourts === 0}
                      selected={
                        chosen?.startsAt.getTime() === time.startsAt.getTime()
                      }
                      onPress={() => setSelected(time.startsAt.getTime())}
                    />
                  ))}
                </ChipGrid>
              </View>
            ))}
            {times.some((time) => time.freeCourts === 0) ? (
              <Text size="meta" tone="muted">
                {`Struck times have no court free for ${minutes} min.`}
              </Text>
            ) : null}
          </>
        )}
      </View>

      {times.length > 0 ? (
        <View style={{ gap: 12 }}>
          <SectionHeading
            title={courtStepTitle(sport)}
            meta={
              chosen
                ? `${courtCountLabel(chosen.freeCourts, sport)} free at ${formatGameClock(chosen.startsAt)}`
                : null
            }
          />
          {chosen ? (
            <>
              <ChipGrid columns={COURT_COLUMNS}>
                {courts.map((entry) => (
                  <ChipTile
                    key={entry.id}
                    label={entry.name}
                    sublabel={courtSublabel(entry)}
                    struck={entry.priceFils === null}
                    selected={entry.id === courtId}
                    onPress={() => setPickedCourt(entry.id)}
                  />
                ))}
              </ChipGrid>
              {courts.some((entry) => entry.fullyBooked) ? (
                <Text size="meta" tone="muted">
                  {`Fully booked ${courtPlural(sport)} have no time free for ${minutes} min on this day.`}
                </Text>
              ) : null}
            </>
          ) : (
            <Text size="meta" tone="muted">
              {courtCoachCopy(sport)}
            </Text>
          )}
        </View>
      ) : null}

      <View>
        <DetailRow label="Cancellation" first>
          {data.cancellationPolicyLines.map((line) => (
            <Text key={line} size="meta" style={{ textAlign: "right" }}>
              {line}
            </Text>
          ))}
        </DetailRow>
        {data.bookingNotes ? (
          <DetailRow label="Good to know">
            <Text size="meta" style={{ textAlign: "right" }}>
              {data.bookingNotes}
            </Text>
          </DetailRow>
        ) : null}
      </View>
    </Screen>
  );
}

function Banner({ venue, venueId }: { venue: BookingVenue; venueId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <VenueBanner
      image={venuePageImage(venue)}
      height={insets.top + BANNER_HEIGHT}
    >
      <View
        style={{
          position: "absolute",
          top: insets.top + spacing.compact - 6,
          left: spacing.surface,
          right: spacing.surface,
        }}
      >
        <ScreenHeader
          nav="back"
          fallback="/book"
          actions={
            <HeaderIconButton
              framed
              icon={Info}
              accessibilityLabel="Venue details"
              onPress={() => router.push(venueDetailsPath(venueId))}
            />
          }
        />
      </View>
    </VenueBanner>
  );
}

function courtSublabel(court: CourtChoice) {
  if (court.priceFils !== null) {
    return formatBookingPriceFils(court.priceFils);
  }
  return court.fullyBooked ? "Fully booked" : "Taken";
}

function Footer({
  chosen,
  court,
  minutes,
  now,
  onContinue,
}: {
  chosen: StartTime | null;
  court: CourtChoice | null;
  minutes: number | null;
  now: Date;
  onContinue: () => void;
}) {
  return (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text size="eyebrow" tone="muted">
          {chosen ? relativeDay(chosen.startsAt, now) : "No time picked"}
        </Text>
        <Text size="meta" weight="semibold" numberOfLines={1}>
          {chosen
            ? `${formatGameClock(chosen.startsAt)}, ${minutes} min${court ? `, ${court.name}` : ""}`
            : "Pick a start time"}
        </Text>
      </View>
      <Button
        label="Continue"
        size="lg"
        disabled={!chosen || !court}
        icon={<ArrowRight size={sizes.iconAction} color={colors.paper} />}
        iconPlacement="trailing"
        onPress={onContinue}
      />
    </>
  );
}
