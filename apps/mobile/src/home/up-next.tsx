import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { homeComingUpRows } from "@repo/domain/home-coming-up";
import { ratingScopeTag } from "@repo/domain/game-rating-impact";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import {
  homeGameKind,
  homeHeroTitle,
  homeHeroUntil,
} from "@repo/domain/home-game-lines";
import {
  homeNextGameActions,
  homeNextGameStatus,
} from "@repo/domain/home-next-game";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { homeNextGameSeats } from "@repo/domain/home-seats";
import { SPORTS, sportLabel, type Sport } from "@repo/domain/sport";
import {
  ArrowRight,
  MapPin,
  Plus,
  Search,
  UserPlus,
} from "lucide-react-native";
import { Pressable, Share, View } from "react-native";

import { bookingShareMessage, relativeDay } from "../booking/booking-model";
import { CardAction, nextActionButton } from "../booking/booking-cards";
import { nextBookingAction, startsInLabel } from "../booking/my-bookings-model";
import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
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

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

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
  const m = useMessages();
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
        {m.mobileHome.upNext.title}
      </Text>
      <Text size="eyebrow" mono uppercase tone="muted">
        {label}
      </Text>
    </View>
  );
}

function Chip({ sport, kind }: { sport: Sport; kind: string }) {
  const m = useMessages();
  const locale = useLocale();
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
        {sportLabel(sport, locale)}
        <Text size="eyebrow" mono uppercase style={{ color: colors.dim }}>
          {m.mobileHome.upNext.withEmphasis(kind)}
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
  when: { day: string | null; emphasis: string | null };
  spoken: string;
  onPress: () => void;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  const m = useMessages();
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
              <Text size="meta">
                {when.day
                  ? m.mobileHome.upNext.withEmphasis(when.emphasis)
                  : when.emphasis}
              </Text>
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
  const locale = useLocale();
  const kickoff = formatHomeKickoff(startsAt, locale);
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
          {homeHeroUntil(startsAt, endsAt, locale)}
        </Text>
      ) : null}
    </View>
  );
}

function Headline({
  title,
  detail,
  pin = false,
}: {
  title: string;
  detail: string | null;
  pin?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text size="lead" weight="semibold" numberOfLines={2}>
        {title}
      </Text>
      {detail ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {pin ? <MapPin size={PIN_ICON} color={colors.dim} /> : null}
          <Text
            size="meta"
            numberOfLines={1}
            style={{ flexShrink: 1, color: colors.dim }}
          >
            {detail}
          </Text>
        </View>
      ) : null}
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
  const m = useMessages();
  const locale = useLocale();
  const { booking } = item;
  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);
  const day = relativeDay(startsAt, now, locale);
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
      kind={m.mobileHome.upNext.kind.booking}
      when={{ day, emphasis: startsInLabel(startsAt, endsAt, now, locale) }}
      spoken={m.mobileHome.upNext.bookingHeroSpoken(
        day,
        formatGameClock(startsAt, locale),
        booking.court.name,
        booking.venue.name,
      )}
      onPress={() => onNavigate({ kind: "booking", bookingId: booking.id })}
      actions={
        <>
          <CardAction
            label={m.mobileHome.upNext.invite}
            icon={UserPlus}
            onPress={() =>
              void Share.share({
                message: bookingShareMessage(
                  {
                    ...booking,
                    startsAt,
                    endsAt,
                  },
                  locale,
                ),
              })
            }
          />
          {action && target ? (
            <Grow>
              <CardAction
                primary
                {...nextActionButton(action, locale)}
                onPress={() => onNavigate(target)}
              />
            </Grow>
          ) : null}
        </>
      }
    >
      <Kickoff startsAt={startsAt} endsAt={endsAt} />
      <Headline title={booking.venue.name} detail={booking.court.name} pin />
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
  const m = useMessages();
  const locale = useLocale();
  const { game } = item;
  const startsAt = item.startsAt;
  const endsAt = game.windowEnd ? new Date(game.windowEnd) : null;
  const day = relativeDay(startsAt, now, locale);
  const open = { kind: "game", gameId: game.id } as const;
  const [row] = homeComingUpRows([game], locale);
  const ratingTag = ratingScopeTag(game, locale);

  if (row && row.kind !== "game") {
    const subline =
      row.kind === "tournament" ? row.teamsLine : row.opponentLine;
    const label =
      row.kind === "tournament" && row.actionLabel
        ? row.actionLabel
        : m.home.nextGame.viewGame;
    return (
      <HeroFrame
        sport={item.sport}
        kind={m.mobileHome.upNext.kind.tournament}
        when={{
          day,
          emphasis: row.kind === "tournament_match" ? row.roundTag : null,
        }}
        spoken={m.mobileHome.upNext.heroSpoken(
          row.title,
          day,
          formatGameClock(startsAt, locale),
        )}
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
        <Headline title={row.title} detail={subline} />
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
    locale,
  });
  const live =
    game.phase === "ongoing" ||
    (game.phase === "upcoming" &&
      startsAt.getTime() <= now.getTime() &&
      (endsAt == null || endsAt.getTime() > now.getTime()));
  const status = live
    ? m.home.nextGame.playingNow
    : game.phase === "upcoming"
      ? (startsInLabel(startsAt, endsAt ?? startsAt, now, locale) ??
        homeNextGameStatus(game.phase, startsAt, now, locale))
      : homeNextGameStatus(game.phase, startsAt, now, locale);
  const title = homeHeroTitle(game, locale);
  const place = m.mobileHome.join.parts(
    [game.venue?.name, game.courtName].filter(isPresent),
  );

  return (
    <HeroFrame
      sport={item.sport}
      kind={homeGameKind(game.format, locale)}
      when={{ day: live ? null : day, emphasis: status }}
      spoken={m.mobileHome.upNext.gameHeroSpoken(
        title,
        day,
        formatGameClock(startsAt, locale),
        place,
      )}
      onPress={() => onNavigate(open)}
      actions={
        <>
          {details ? (
            <CardAction
              label={m.mobileHome.upNext.details}
              onPress={() => onNavigate(details)}
            />
          ) : null}
          <Grow>
            <CardAction
              primary
              label={primary.label}
              icon={
                primary.label === m.home.nextGame.invitePlayer
                  ? UserPlus
                  : undefined
              }
              onPress={() => onNavigate(primary.target)}
            />
          </Grow>
        </>
      }
    >
      <Kickoff startsAt={startsAt} endsAt={endsAt} />
      <Headline title={title} detail={place || null} pin />
      {ratingTag ? (
        <Text size="meta" weight="semibold">
          {ratingTag}
        </Text>
      ) : null}
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
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const palette = useTonePalette();
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {items.map((item, index) => {
        const row = upNextRowView(item, now, locale);
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
          {m.mobileHome.upNext.allBookingsAndGames}
        </Text>
        <ArrowRight
          size={PIN_ICON}
          color={palette.foreground}
          style={mirrorInRtl}
        />
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
  const m = useMessages();
  const label = m.mobileHome.upNext.book[sport];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        venues ? m.mobileHome.join.nameWithDetail(label, venues) : label
      }
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
      <ArrowRight size={ROW_ICON} color={colors.ink} style={mirrorInRtl} />
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
  const m = useMessages();
  const locale = useLocale();
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
            {m.mobileHome.upNext.thisWeekTag}
            <Text size="eyebrow" mono uppercase tone="muted">
              {` / ${m.mobileHome.upNext.free}`}
            </Text>
          </Text>
        </View>
        <Text size="h1Lg" width="expanded" accessibilityRole="header">
          {m.mobileHome.upNext.weekOpen}
        </Text>
        <Text size="meta" tone="muted">
          {m.mobileHome.upNext.emptyBody}
        </Text>
      </View>
      {SPORTS.map((sport) => (
        <BookRow
          key={sport}
          sport={sport}
          venues={venueCountLabel(venueCounts[sport], locale)}
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
          label={m.mobileHome.upNext.findAGame}
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
