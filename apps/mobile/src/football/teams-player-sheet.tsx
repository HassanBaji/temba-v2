import { radii } from "@repo/design-tokens";
import {
  ofSide,
  otherSide,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import {
  teamsPlayerCardForm,
  teamsPlayerCardHead,
} from "@repo/domain/football-teams-card";
import type { FormMark } from "@repo/domain/member-form-marks";
import { Fragment } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { FormSlot } from "../primitives/form-slot";
import { GuestMark } from "../primitives/guest-mark";
import { hairline } from "../primitives/hairline-width";
import { NicknameName } from "../primitives/nickname-name";
import { Sheet, SheetCloseButton } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";

const FORM_SLOT = 26;
/** The rating is the widest figure, so its column takes more of the row. */
const RATING_COLUMN = 1.4;

function Rule() {
  const colors = useColors();
  return <View style={{ height: hairline, backgroundColor: colors.rule }} />;
}

function Stat({
  value,
  label,
  pending = false,
  flex = 1,
}: {
  value: string;
  label: string;
  pending?: boolean;
  flex?: number;
}) {
  const m = useMessages().football.teamsCard;
  return (
    <View
      accessible
      accessibilityLabel={pending ? undefined : m.statSpoken(value, label)}
      style={{ flex, minWidth: 0, gap: 2 }}
    >
      {pending ? (
        <Skeleton height={26} radius={radii.sm} />
      ) : (
        <Text
          size="h2"
          width="expanded"
          ltr
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      )}
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function StatsRow({ children }: { children: React.ReactNode[] }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {children.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View style={{ width: hairline, backgroundColor: colors.rule }} />
          ) : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

function FormStrip({ slots }: { slots: readonly FormMark[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {slots.map((mark, index) => (
        <View key={index} style={{ width: FORM_SLOT, flexDirection: "row" }}>
          <FormSlot variant={mark} compact />
        </View>
      ))}
    </View>
  );
}

function Action({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, minWidth: 0 }}>{children}</View>;
}

/**
 * A pool player's short profile on Make teams: the number the teams balance
 * on and how it moved this month, Games, goals and MVPs in the Group and the
 * last five results. From here the Organizer puts them on a team, names them
 * their side's captain or opens the full profile.
 */
export function TeamsPlayerSheet({
  gameId,
  player,
  side,
  names,
  balanceOn,
  isCaptain,
  canBeCaptain,
  onClose,
  onPlace,
  onToggleCaptain,
  onOpenProfile,
}: {
  gameId: string;
  player: BoardPlayer | null;
  /** The side the player is on; null while not placed. */
  side: Side | null;
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  isCaptain: boolean;
  canBeCaptain: boolean;
  onClose: () => void;
  onPlace: (side: Side) => void;
  onToggleCaptain: () => void;
  onOpenProfile: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.teamsCard;
  const card = api.games.footballPlayerCard.useQuery(
    { gameId, userId: player?.userId ?? "" },
    { enabled: player != null },
  );
  if (!player) {
    return (
      <Sheet visible={false} onClose={onClose}>
        {null}
      </Sheet>
    );
  }

  const stats = card.data;
  const pending = card.isLoading;
  const head = teamsPlayerCardHead(
    player,
    {
      balanceOn,
      sideName: side ? ofSide(names, side) : null,
      pointsThisMonth: stats?.pointsThisMonth,
    },
    locale,
  );
  const form = teamsPlayerCardForm(
    stats?.form ?? [],
    stats?.games ?? 0,
    locale,
  );
  const moveTo: Side[] = side ? [otherSide(side)] : [1, 2];

  return (
    <Sheet visible onClose={onClose}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar
            name={player.name}
            uri={player.image}
            size="court"
            guest={player.guest}
          />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View accessibilityRole="header">
              <NicknameName
                name={head.name}
                isNickname={head.isNickname}
                size="h2"
                width="expanded"
                numberOfLines={0}
              />
            </View>
            {player.guest ? <GuestMark /> : null}
            <Text size="meta" tone="muted">
              {head.subtitle}
            </Text>
          </View>
          <SheetCloseButton onPress={onClose} />
        </View>
        <Rule />
        <StatsRow>
          {[
            <Stat
              key="rating"
              value={head.ratingValue}
              label={head.ratingLabel}
              flex={RATING_COLUMN}
            />,
            <Stat
              key="games"
              value={String(stats?.games ?? 0)}
              label={m.games(stats?.games ?? 0)}
              pending={pending}
            />,
            <Stat
              key="goals"
              value={String(stats?.goals ?? 0)}
              label={m.goals(stats?.goals ?? 0)}
              pending={pending}
            />,
            <Stat
              key="mvps"
              value={String(stats?.mvps ?? 0)}
              label={m.mvps}
              pending={pending}
            />,
          ]}
        </StatsRow>
        <Rule />
        {card.error ? (
          <Text size="meta" tone="muted" accessibilityRole="alert">
            {m.statsFailed}
          </Text>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              minHeight: FORM_SLOT,
            }}
          >
            {pending ? null : (
              <>
                <Text size="meta" tone="muted" style={{ flexShrink: 1 }}>
                  {form.caption}
                </Text>
                <FormStrip slots={form.slots} />
              </>
            )}
          </View>
        )}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {moveTo.map((target) => (
              <Action key={target}>
                <Button
                  label={m.moveTo(ofSide(names, target))}
                  variant="outline"
                  size="lg"
                  onPress={() => onPlace(target)}
                />
              </Action>
            ))}
            {canBeCaptain ? (
              <Action>
                <Button
                  label={isCaptain ? m.removeCaptain : m.makeCaptain}
                  variant="outline"
                  size="lg"
                  onPress={onToggleCaptain}
                />
              </Action>
            ) : null}
          </View>
          {player.guest ? null : (
            <Button label={m.fullProfile} size="lg" onPress={onOpenProfile} />
          )}
        </View>
      </View>
    </Sheet>
  );
}
