import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { homeComingUpRows } from "@repo/domain/home-coming-up";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import {
  homeNextGameActions,
  homeNextGameStatus,
} from "@repo/domain/home-next-game";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { homeNextGameSeats } from "@repo/domain/home-seats";
import { SPORT_LABELS, SPORTS, type Sport } from "@repo/domain/sport";
import {
  ArrowRight,
  MapPin,
  Plus,
  Search,
  UserPlus,
} from "lucide-react-native";
import { Pressable, Share, View } from "react-native";

import {
  bookingShareMessage,
  minutesBetween,
  relativeDay,
  untilLabel,
} from "../booking/booking-model";
import { CardAction, nextActionButton } from "../booking/booking-cards";
import { nextBookingAction, startsInLabel } from "../booking/my-bookings-model";
import { useNow } from "../games/use-now";
import { SportGlyph } from "../lib/sport-glyph";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { venueCountLabel } from "./home-model";
import type { HomeNavTarget } from "./home-target";
import {
  upNextRowView,
  type UpNextItem,
  type UpNextRowView,
} from "./up-next-model";

type Navigate = (target: HomeNavTarget) => void;

const CHIP_ICON = 13;
const PIN_ICON = 14;
const ROW_ICON = 16;
const BAR_WIDTH = 7;
const BAR_HEIGHT = 16;
const DAY_COLUMN = 58;
const BOOK_ICON_TILE = 38;
const BOOK_ICON = 17;
const ACTION_TILE_HEIGHT = 44;

export function UpNextHeading({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="lead" weight="semibold" accessibilityRole="header">
        Up next
      </Text>
      <Text size="eyebrow" mono uppercase tone="muted">
        {label}
      </Text>
    </View>
  );
}

function Chip({ sport, kind }: { sport: Sport; kind: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 6,
        paddingRight: 8,
        paddingVertical: 3,
        borderRadius: radii.slot,
        borderWidth: hairline,
        borderColor: colors.dimrule,
      }}
    >
      <SportGlyph sport={sport} color={colors.paper} size={CHIP_ICON} />
      <Text size="eyebrow" mono uppercase>
        {SPORT_LABELS[sport]}
        <Text size="eyebrow" mono uppercase style={{ color: colors.dim }}>
          {` / ${kind}`}
        </Text>
      </Text>
    </View>
  );
}

function HeroFrame({
  sport,
  kind,
  when,
  spoken,
  onPress,
  children,
  actions,
}: {
  sport: Sport;
  kind: string;
  when: { day: string; emphasis: string | null };
  spoken: string;
  onPress: () => void;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <Surface tone="ink" padded={false} style={{ padding: spacing.compact }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        onPress={onPress}
        style={({ pressed }) => ({ gap: 14, opacity: pressed ? 0.9 : 1 })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Chip sport={sport} kind={kind} />
          <Text
            size="meta"
            numberOfLines={1}
            style={{ flexShrink: 1, color: colors.dim }}
          >
            {when.day}
            {when.emphasis ? (
              <Text size="meta">{`, ${when.emphasis}`}</Text>
            ) : null}
          </Text>
        </View>
        {children}
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: hairline,
          borderTopColor: colors.dimrule,
        }}
      >
        {actions}
      </View>
    </Surface>
  );
}

function Kickoff({
  startsAt,
  endsAt,
}: {
  startsAt: Date;
  endsAt: Date | null;
}) {
  const kickoff = formatHomeKickoff(startsAt);
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        columnGap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
        <Text size="record" width="expanded" weight="bold">
          {kickoff.time}
        </Text>
        {kickoff.meridiem ? (
          <Text size="figure" width="expanded" weight="bold">
            {kickoff.meridiem}
          </Text>
        ) : null}
      </View>
      {endsAt ? (
        <Text size="meta" style={{ color: colors.dim }}>
          {untilLabel(endsAt)}
          <Text size="meta" style={{ color: colors.dimrule }}>
            {" / "}
          </Text>
          {`${minutesBetween(startsAt, endsAt)} min`}
        </Text>
      ) : null}
    </View>
  );
}

function Place({ lead, rest }: { lead: string; rest: string | null }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MapPin size={PIN_ICON} color={colors.dim} />
      <Text numberOfLines={1} style={{ flexShrink: 1 }}>
        <Text weight="semibold">{lead}</Text>
        {rest ? <Text style={{ color: colors.dim }}>{`  ${rest}`}</Text> : null}
      </Text>
    </View>
  );
}

function Grow({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

function BookingHero({
  item,
  now,
  onNavigate,
}: {
  item: Extract<UpNextItem, { kind: "booking" }>;
  now: Date;
  onNavigate: Navigate;
}) {
  const { booking } = item;
  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);
  const day = relativeDay(startsAt, now);
  const action = nextBookingAction(booking);
  const target: HomeNavTarget | null =
    action === "finish_payment"
      ? { kind: "booking-payment", bookingId: booking.id }
      : action === "open_game" && booking.gameId
        ? { kind: "game", gameId: booking.gameId }
        : action === "make_game"
          ? { kind: "booking-game", bookingId: booking.id }
          : null;

  return (
    <HeroFrame
      sport={item.sport}
      kind="Booking"
      when={{ day, emphasis: startsInLabel(startsAt, endsAt, now) }}
      spoken={`Next up, booking, ${day} ${formatGameClock(startsAt)}, ${booking.court.name}, ${booking.venue.name}`}
      onPress={() => onNavigate({ kind: "booking", bookingId: booking.id })}
      actions={
        <>
          <CardAction
            label="Invite"
            icon={UserPlus}
            onPress={() =>
              void Share.share({
                message: bookingShareMessage({
                  ...booking,
                  startsAt,
                  endsAt,
                }),
              })
            }
          />
          {action && target ? (
            <Grow>
              <CardAction
                primary
                {...nextActionButton(action)}
                onPress={() => onNavigate(target)}
              />
            </Grow>
          ) : null}
        </>
      }
    >
      <Kickoff startsAt={startsAt} endsAt={endsAt} />
      <Place lead={booking.venue.name} rest={booking.court.name} />
    </HeroFrame>
  );
}

function GameHero({
  item,
  now,
  onNavigate,
}: {
  item: Extract<UpNextItem, { kind: "game" }>;
  now: Date;
  onNavigate: Navigate;
}) {
  const { game } = item;
  const startsAt = item.startsAt;
  const endsAt = game.windowEnd ? new Date(game.windowEnd) : null;
  const day = relativeDay(startsAt, now);
  const open = { kind: "game", gameId: game.id } as const;
  const [row] = homeComingUpRows([game]);

  if (row && row.kind !== "game") {
    const subline =
      row.kind === "tournament" ? row.teamsLine : row.opponentLine;
    const label =
      row.kind === "tournament" && row.actionLabel
        ? row.actionLabel
        : "View game";
    return (
      <HeroFrame
        sport={item.sport}
        kind="Tournament"
        when={{
          day,
          emphasis: row.kind === "tournament_match" ? row.roundTag : null,
        }}
        spoken={`Next up, ${row.title}, ${day} ${formatGameClock(startsAt)}`}
        onPress={() => onNavigate(open)}
        actions={
          <Grow>
            <CardAction
              primary
              label={label}
              onPress={() => onNavigate(open)}
            />
          </Grow>
        }
      >
        <Kickoff startsAt={startsAt} endsAt={null} />
        <Place lead={row.title} rest={subline} />
      </HeroFrame>
    );
  }

  const seats = homeNextGameSeats(
    game.sides,
    game.registeredUserCount,
    game.playersAllowed,
  );
  const { primary, details } = homeNextGameActions({
    gameId: game.id,
    phase: game.phase,
    hasOpenSeat: seats.some((seat) => !seat.filled),
  });
  const status =
    game.phase === "upcoming"
      ? (startsInLabel(startsAt, endsAt ?? startsAt, now) ??
        homeNextGameStatus(game.phase, startsAt, now))
      : homeNextGameStatus(game.phase, startsAt, now);
  const title = game.name ?? game.groupName ?? game.venue?.name ?? "Game";
  const place = [game.venue?.name, game.courtName].filter(Boolean).join(", ");

  return (
    <HeroFrame
      sport={item.sport}
      kind="Game"
      when={{ day, emphasis: status }}
      spoken={`Next up, ${title}, ${day} ${formatGameClock(startsAt)}, ${place}`}
      onPress={() => onNavigate(open)}
      actions={
        <>
          {details ? (
            <CardAction label="Details" onPress={() => onNavigate(details)} />
          ) : null}
          <Grow>
            <CardAction
              primary
              label={primary.label}
              icon={primary.label === "Invite a player" ? UserPlus : undefined}
              onPress={() => onNavigate(primary.target)}
            />
          </Grow>
        </>
      }
    >
      <Kickoff startsAt={startsAt} endsAt={endsAt} />
      <Place lead={title} rest={place && place !== title ? place : null} />
      {game.rated ? null : (
        <Text size="meta" weight="semibold">
          {UNRATED_LABEL}
        </Text>
      )}
    </HeroFrame>
  );
}

export function UpNextHero({
  item,
  onNavigate,
}: {
  item: UpNextItem;
  onNavigate: Navigate;
}) {
  const now = useNow();
  return item.kind === "booking" ? (
    <BookingHero item={item} now={now} onNavigate={onNavigate} />
  ) : (
    <GameHero item={item} now={now} onNavigate={onNavigate} />
  );
}

function SeatBars({ bars }: { bars: readonly ("taken" | "open")[] }) {
  const palette = useTonePalette();
  return (
    <View style={{ flexDirection: "row", gap: 3, height: BAR_HEIGHT }}>
      {bars.map((kind, index) =>
        kind === "taken" ? (
          <View
            key={index}
            style={{
              width: BAR_WIDTH,
              borderRadius: 2,
              backgroundColor: palette.foreground,
            }}
          />
        ) : (
          <View key={index} style={{ width: BAR_WIDTH }}>
            <Hatch radius={2} />
          </View>
        ),
      )}
    </View>
  );
}

function Trailing({ row }: { row: UpNextRowView }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: "flex-end", gap: 5 }}
    >
      <SportGlyph sport={row.sport} color={palette.muted} size={ROW_ICON} />
      {row.trailing?.kind === "bars" ? (
        <SeatBars bars={row.trailing.bars} />
      ) : row.trailing?.kind === "tag" ? (
        <Text size="eyebrow" mono uppercase>
          {row.trailing.label}
        </Text>
      ) : row.trailing ? (
        <Text size="eyebrow" tone="muted">
          {row.trailing.label}
        </Text>
      ) : null}
    </View>
  );
}

function rowTarget(item: UpNextItem): HomeNavTarget {
  return item.kind === "booking"
    ? { kind: "booking", bookingId: item.booking.id }
    : { kind: "game", gameId: item.game.id };
}

export function UpNextList({
  items,
  onNavigate,
}: {
  items: readonly UpNextItem[];
  onNavigate: Navigate;
}) {
  const now = useNow();
  const palette = useTonePalette();
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {items.map((item, index) => {
        const row = upNextRowView(item, now);
        return (
          <View key={row.key}>
            {index === 0 ? null : <Hairline />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={row.spoken}
              onPress={() => onNavigate(rowTarget(item))}
              style={({ pressed }) => ({
                minHeight: sizes.touchTarget + 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{ width: DAY_COLUMN }}
              >
                <Text size="lead" width="expanded" weight="bold">
                  {row.day}
                </Text>
                <Text size="eyebrow" tone="muted" numberOfLines={1}>
                  {row.time}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text weight="semibold" numberOfLines={1}>
                  {row.title}
                </Text>
                {row.detail ? (
                  <Text size="meta" tone="muted" numberOfLines={1}>
                    {row.detail}
                  </Text>
                ) : null}
              </View>
              <Trailing row={row} />
            </Pressable>
          </View>
        );
      })}
      {items.length > 0 ? <Hairline /> : null}
      <Pressable
        accessibilityRole="link"
        onPress={() => onNavigate({ kind: "browse-games" })}
        style={({ pressed }) => ({
          minHeight: sizes.touchTarget,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text size="meta" weight="semibold">
          All bookings and games
        </Text>
        <ArrowRight size={PIN_ICON} color={palette.foreground} />
      </Pressable>
    </Surface>
  );
}

function BookRow({
  sport,
  venues,
  onPress,
}: {
  sport: Sport;
  venues: string | null;
  onPress: () => void;
}) {
  const label = `Book ${sport}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={venues ? `${label}, ${venues}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: spacing.compact,
        paddingVertical: 12,
        borderBottomWidth: hairline,
        borderBottomColor: colors.rule,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: BOOK_ICON_TILE,
          height: BOOK_ICON_TILE,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: colors.wash,
        }}
      >
        <SportGlyph sport={sport} color={colors.ink} size={BOOK_ICON} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{label}</Text>
        {venues ? (
          <Text size="eyebrow" tone="muted">
            {venues}
          </Text>
        ) : null}
      </View>
      <ArrowRight size={ROW_ICON} color={colors.ink} />
    </Pressable>
  );
}

function OutlineTile({
  label,
  icon: Icon,
  onPress,
}: {
  label: string;
  icon: typeof Search;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: ACTION_TILE_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={PIN_ICON} color={colors.ink} />
      <Text weight="semibold">{label}</Text>
    </Pressable>
  );
}

export function UpNextEmpty({
  venueCounts,
  createAction,
  onNavigate,
}: {
  venueCounts: Record<Sport, number | null>;
  createAction: HomeNoGamesCreateAction;
  onNavigate: Navigate;
}) {
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        style={{
          gap: 12,
          paddingHorizontal: spacing.compact,
          paddingTop: spacing.compact,
          paddingBottom: 16,
          borderBottomWidth: hairline,
          borderBottomColor: colors.rule,
        }}
      >
        <Hatch radius={0} bordered={false} />
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radii.slot,
            borderWidth: hairline,
            borderColor: colors.rule,
            backgroundColor: colors.paper,
          }}
        >
          <Text size="eyebrow" mono uppercase>
            This week
            <Text size="eyebrow" mono uppercase tone="muted">
              {" / Free"}
            </Text>
          </Text>
        </View>
        <Text size="h1Lg" width="expanded" accessibilityRole="header">
          {"Your week\nis open."}
        </Text>
        <Text size="meta" tone="muted">
          Book a court, join an open game, or start one with your group.
        </Text>
      </View>
      {SPORTS.map((sport) => (
        <BookRow
          key={sport}
          sport={sport}
          venues={venueCountLabel(venueCounts[sport])}
          onPress={() => onNavigate({ kind: "book", sport })}
        />
      ))}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: spacing.compact,
          paddingTop: 12,
          paddingBottom: 16,
        }}
      >
        <OutlineTile
          label="Find a game"
          icon={Search}
          onPress={() => onNavigate({ kind: "browse-games" })}
        />
        <OutlineTile
          label={createAction.label}
          icon={Plus}
          onPress={() => onNavigate(createAction.target)}
        />
      </View>
    </Surface>
  );
}
