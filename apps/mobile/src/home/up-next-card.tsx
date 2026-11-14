import {
  bibColors,
  palettes,
  radii,
  sizes,
  spacing,
} from "@repo/design-tokens";
import {
  Activity,
  CalendarCheck,
  Clock,
  CreditCard,
  ListOrdered,
  MapPin,
  Navigation,
  PenLine,
  Plus,
  Shirt,
  Shuffle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { Linking, Platform, Pressable, Share, View } from "react-native";

import { bookingShareMessage, directionsUrl } from "../booking/booking-model";
import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { SportGlyph } from "../lib/sport-glyph";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { initialsFor } from "../primitives/initials";
import { Text } from "../primitives/text";
import { useColors, useColorSchemeName } from "../theme/theme-provider";
import type { HomeNavTarget } from "./home-target";
import type {
  CardAction,
  CardActionIcon,
  CardPerson,
  CardSeat,
  CardStepIcon,
  CardWho,
} from "@repo/domain/home-up-next-card";
import { upNextCardView, type MobileCardTarget } from "./up-next-card-model";
import type { UpNextItem } from "./up-next-model";

type Navigate = (target: HomeNavTarget) => void;

const CHIP = 28;
const TEAM_CHIP = 30;
const STEP_TILE = 32;
const STEP_ICON = 16;
const PIN_ICON = 15;
const SPORT_ICON = 14;
const ACTION_ICON = 16;
const ACTION_HEIGHT = 48;
const SWATCH = 12;
const BAR_HEIGHT = 8;

const STEP_ICONS: Record<CardStepIcon, LucideIcon> = {
  invite: UserPlus,
  shirt: Shirt,
  teams: Users,
  clock: Clock,
  live: Activity,
  score: PenLine,
  rounds: ListOrdered,
  pay: CreditCard,
  court: CalendarCheck,
};

const ACTION_ICONS: Record<CardActionIcon, LucideIcon> = {
  invite: UserPlus,
  directions: Navigation,
  teams: Shuffle,
  score: PenLine,
};

/**
 * The lifted roles of Palette v2 (ADR-0084). The rest of the mobile App still
 * reads the inverted light focus, so Home's card takes these from `palettes`.
 */
function useLifted() {
  const v2 = palettes[useColorSchemeName()];
  return {
    card: v2.focus,
    edge: v2.focusEdge,
    rule: v2.dimrule,
    raised: v2.raised,
  };
}

/** The Up next card: the lifted focus surface, with one solid button. */
export function LiftedCard({ children }: { children: React.ReactNode }) {
  const lifted = useLifted();
  return (
    <View
      style={{
        backgroundColor: lifted.card,
        borderRadius: radii.surface,
        borderWidth: hairline,
        borderColor: lifted.edge,
        padding: spacing.compact,
      }}
    >
      {children}
    </View>
  );
}

function Rule() {
  const colors = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: hairline,
        backgroundColor: colors.rule,
        marginVertical: 14,
      }}
    />
  );
}

function PersonChip({
  person,
  size = CHIP,
}: {
  person: CardPerson;
  size?: number;
}) {
  const colors = useColors();
  const lifted = useLifted();
  const solid = person.isViewer;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: solid ? colors.ink : lifted.raised,
        borderWidth: solid ? 0 : hairline,
        borderColor: lifted.rule,
      }}
    >
      <Text
        size="eyebrow"
        weight="semibold"
        style={{ color: solid ? colors.paper : colors.ink }}
      >
        {initialsFor(person.name)}
      </Text>
    </View>
  );
}

function OpenChip() {
  const colors = useColors();
  return (
    <View style={{ width: CHIP, height: CHIP }}>
      <Hatch radius={radii.sm} />
      <View
        style={{
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Plus size={14} color={colors.muted} />
      </View>
    </View>
  );
}

function SeatRow({ seat }: { seat: CardSeat }) {
  const m = useMessages();
  const name = seat.filled
    ? seat.isViewer
      ? m.common.you
      : seat.name
    : m.home.upNextCard.open;
  return (
    <View
      accessible
      accessibilityLabel={
        seat.filled
          ? m.home.upNextCard.seatSpoken(name, seat.sideLabel)
          : m.home.upNextCard.openSeatSpoken(seat.sideLabel)
      }
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      {seat.filled ? <PersonChip person={seat} /> : <OpenChip />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          size="meta"
          weight={seat.filled ? "semibold" : "regular"}
          tone={seat.filled ? "default" : "muted"}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {seat.sideLabel}
        </Text>
      </View>
    </View>
  );
}

function WhoHeader({
  header,
  scope,
}: {
  header: string;
  scope: string | null;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <Text size="meta" weight="semibold" numberOfLines={1}>
        {header}
      </Text>
      {scope ? (
        <Text
          size="meta"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {scope}
        </Text>
      ) : null}
    </View>
  );
}

function PoolBar({ bar }: { bar: readonly ("taken" | "open")[] }) {
  const colors = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 3, height: BAR_HEIGHT }}
    >
      {bar.map((seat, index) =>
        seat === "taken" ? (
          <View
            key={index}
            style={{ flex: 1, borderRadius: 2, backgroundColor: colors.ink }}
          />
        ) : (
          <View key={index} style={{ flex: 1 }}>
            <Hatch radius={2} />
          </View>
        ),
      )}
    </View>
  );
}

function BibSwatch({ bib }: { bib: string }) {
  const colors = useColors();
  const lifted = useLifted();
  const fill =
    bib in bibColors ? bibColors[bib as keyof typeof bibColors].fill : null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: SWATCH,
        height: SWATCH,
        borderRadius: 3,
        backgroundColor: fill ?? lifted.raised,
        borderWidth: hairline,
        borderColor: colors.inputBorder,
      }}
    />
  );
}

function Who({ who }: { who: CardWho }) {
  const m = useMessages();
  if (who.kind === "line") {
    return <WhoHeader header={who.header} scope={who.scope} />;
  }

  if (who.kind === "sides") {
    return (
      <View>
        <WhoHeader header={who.header} scope={who.scope} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            {who.sides[0].map((seat) => (
              <SeatRow key={seat.key} seat={seat} />
            ))}
          </View>
          <Text size="eyebrow" tone="muted">
            {m.home.upNextCard.vs}
          </Text>
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            {who.sides[1].map((seat) => (
              <SeatRow key={seat.key} seat={seat} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (who.kind === "pool") {
    return (
      <View style={{ gap: 12 }}>
        <View>
          <WhoHeader header={who.header} scope={who.scope} />
          <PoolBar bar={who.bar} />
        </View>
        {who.positions.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              columnGap: 12,
              rowGap: 4,
            }}
          >
            {who.positions.map((count) => (
              <Text key={count.label} size="eyebrow" tone="muted">
                <Text size="eyebrow" weight="semibold">
                  {count.value}
                </Text>{" "}
                {count.label}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <WhoHeader header={who.header} scope={who.scope} />
      <View style={{ flexDirection: "row", gap: 14 }}>
        {who.teams.map((team) => (
          <View
            key={team.key}
            accessible
            accessibilityLabel={m.home.upNextCard.teamSpoken(
              team.label,
              team.members.map((member) =>
                member.isViewer ? m.common.you : member.name,
              ),
            )}
            style={{ flex: 1, minWidth: 0, gap: 8 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <BibSwatch bib={team.bib} />
              <Text size="meta" weight="semibold" numberOfLines={1}>
                {team.label}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {team.members.map((member) => (
                <PersonChip key={member.key} person={member} size={TEAM_CHIP} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ActionButton({
  action,
  primary,
  onPress,
}: {
  action: CardAction<MobileCardTarget>;
  primary: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const lifted = useLifted();
  const Icon = action.icon ? ACTION_ICONS[action.icon] : null;
  const foreground = primary ? colors.paper : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: primary ? 1 : undefined,
        minWidth: primary ? undefined : 96,
        height: ACTION_HEIGHT,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: radii.lg,
        backgroundColor: primary ? colors.ink : lifted.raised,
        borderWidth: primary ? 0 : hairline,
        borderColor: lifted.rule,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {Icon ? <Icon size={ACTION_ICON} color={foreground} /> : null}
      <Text weight="semibold" numberOfLines={1} style={{ color: foreground }}>
        {action.label}
      </Text>
    </Pressable>
  );
}

export function UpNextCard({
  item,
  onNavigate,
}: {
  item: UpNextItem;
  onNavigate: Navigate;
}) {
  const colors = useColors();
  const lifted = useLifted();
  const locale = useLocale();
  const now = useNow();
  const view = upNextCardView(item, now, locale);
  const StepIcon = STEP_ICONS[view.step.icon];

  const run = (target: MobileCardTarget) => {
    if (target.kind === "directions") {
      if (item.kind === "game" && item.game.venue) {
        void Linking.openURL(
          directionsUrl(
            { ...item.game.venue, latitude: null, longitude: null },
            Platform.OS,
            locale,
          ),
        );
      }
      return;
    }
    if (target.kind === "share-booking") {
      if (item.kind === "booking") {
        void Share.share({
          message: bookingShareMessage(
            {
              ...item.booking,
              startsAt: new Date(item.booking.startsAt),
              endsAt: new Date(item.booking.endsAt),
            },
            locale,
          ),
        });
      }
      return;
    }
    onNavigate(target);
  };

  return (
    <LiftedCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={view.spoken}
        onPress={() => run(view.open)}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <SportGlyph sport={view.sport} color={colors.ink} size={SPORT_ICON} />
          <Text size="meta" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
            <Text size="meta" weight="semibold">
              {view.sportName}
            </Text>
            {view.title ? (
              <Text size="meta" tone="muted">{`  ${view.title}`}</Text>
            ) : null}
          </Text>
          {view.countdown ? (
            <Text size="meta" weight="semibold" numberOfLines={1}>
              {view.countdown}
            </Text>
          ) : null}
        </View>
        <Text size="meta" tone="muted" style={{ marginTop: 12 }}>
          {view.dateLine}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            columnGap: 8,
          }}
        >
          <Text size="record" width="expanded" weight="bold">
            {view.kickoff.time}
          </Text>
          {view.kickoff.meridiem ? (
            <Text size="title" width="expanded" weight="bold">
              {view.kickoff.meridiem}
            </Text>
          ) : null}
          {view.until ? (
            <Text size="meta" tone="muted">
              {view.until}
            </Text>
          ) : null}
        </View>
        {view.place ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
            }}
          >
            <MapPin size={PIN_ICON} color={colors.muted} />
            <Text numberOfLines={1} style={{ flexShrink: 1 }}>
              {view.place}
            </Text>
          </View>
        ) : null}
        {view.who ? (
          <>
            <Rule />
            <Who who={view.who} />
          </>
        ) : null}
        <Rule />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              width: STEP_TILE,
              height: STEP_TILE,
              borderRadius: radii.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: lifted.raised,
              borderWidth: hairline,
              borderColor: lifted.rule,
            }}
          >
            <StepIcon size={STEP_ICON} color={colors.ink} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text weight="semibold">{view.step.title}</Text>
            <Text size="meta" tone="muted">
              {view.step.body}
            </Text>
          </View>
        </View>
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 16,
          minHeight: sizes.touchTarget,
        }}
      >
        {view.secondary ? (
          <ActionButton
            action={view.secondary}
            primary={false}
            onPress={() => run(view.secondary!.target)}
          />
        ) : null}
        <ActionButton
          action={view.primary}
          primary
          onPress={() => run(view.primary.target)}
        />
      </View>
    </LiftedCard>
  );
}
