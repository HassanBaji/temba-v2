import { formatTierDelta } from "@repo/domain/tier-adjust";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import type { FormMark } from "@repo/domain/member-form-marks";
import {
  slotCode,
  teamsTileRating,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { TIER_PROVISIONAL_GAMES } from "@repo/domain/tier-points";
import { Fragment } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { FormSlot } from "../primitives/form-slot";
import { GuestMark } from "../primitives/guest-mark";
import { hairline } from "../primitives/hairline-width";
import { Sheet, SheetCloseButton } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";

const FORM_SLOT = 26;

function Rule() {
  const colors = useColors();
  return <View style={{ height: hairline, backgroundColor: colors.rule }} />;
}

function Stat({
  value,
  label,
  pending,
}: {
  value: string;
  label: string;
  pending: boolean;
}) {
  const m = useMessages().mobileTournament.makeTeams.card;
  return (
    <View
      accessible
      accessibilityLabel={pending ? undefined : m.statSpoken(value, label)}
      style={{ flex: 1, minWidth: 0, gap: 2 }}
    >
      {pending ? (
        <Skeleton height={26} radius={6} />
      ) : (
        <Text size="h2" width="expanded" ltr>
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

/** The last five results, oldest first, the slots not reached yet hatched. */
function FormStrip({ form }: { form: readonly FormMark[] }) {
  const slots: FormMark[] = [
    ...form,
    ...Array<FormMark>(Math.max(0, 5 - form.length)).fill("not-played"),
  ];
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

/**
 * A pool player's short profile on Make teams: the number the teams balance
 * on and how it moved this month, Games, goals and MVPs in the Group and the
 * last five results. From here the Organizer moves them across, names them
 * their side's captain or opens the full profile.
 */
export function TeamsPlayerSheet({
  gameId,
  player,
  sideName,
  otherSideName,
  balanceOn,
  isCaptain,
  canBeCaptain,
  onClose,
  onMove,
  onToggleCaptain,
  onOpenProfile,
}: {
  gameId: string;
  player: BoardPlayer | null;
  /** The team the player is on; null while not placed. */
  sideName: string | null;
  otherSideName: string | null;
  balanceOn: FootballBalanceOn;
  isCaptain: boolean;
  canBeCaptain: boolean;
  onClose: () => void;
  onMove: () => void;
  onToggleCaptain: () => void;
  onOpenProfile: () => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.makeTeams;
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

  const rating = teamsTileRating(player, balanceOn, locale);
  const unrated = rating.kind === "new";
  const code = slotCode(player, locale);
  const gamesLeft = Math.max(
    0,
    TIER_PROVISIONAL_GAMES - (player.tier?.gamesOfFive ?? 0),
  );
  const subtitle = [
    sideName && code
      ? m.card.sideUsually(sideName, code)
      : (sideName ??
        (code ? m.card.sideUsually(m.notPlaced, code) : m.notPlaced)),
    unrated && balanceOn === "tierPoints"
      ? m.card.notRatedYet(gamesLeft)
      : null,
  ]
    .filter(Boolean)
    .join(". ");
  const delta = card.data?.pointsThisMonth;
  const ratingLabel = unrated
    ? balanceOn === "tierPoints"
      ? m.card.pointsAfter(TIER_PROVISIONAL_GAMES)
      : m.card.ovr
    : balanceOn === "ovr"
      ? m.card.ovr
      : delta
        ? m.card.pointsThisMonth(formatTierDelta(delta))
        : m.card.points;
  const pending = card.isLoading;
  const stats = card.data;
  const form = stats?.form ?? [];
  const name = player.nickname?.name ?? player.name;

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
            <Text size="h2" width="expanded" accessibilityRole="header">
              {name}
            </Text>
            {player.guest ? <GuestMark /> : null}
            <Text size="meta" tone="muted">
              {subtitle}
            </Text>
          </View>
          <SheetCloseButton onPress={onClose} />
        </View>
        <Rule />
        <StatsRow>
          {[
            <Stat
              key="rating"
              value={rating.value}
              label={ratingLabel}
              pending={false}
            />,
            <Stat
              key="games"
              value={String(stats?.games ?? 0)}
              label={m.card.games(stats?.games ?? 0)}
              pending={pending}
            />,
            <Stat
              key="goals"
              value={String(stats?.goals ?? 0)}
              label={m.card.goals(stats?.goals ?? 0)}
              pending={pending}
            />,
            <Stat
              key="mvps"
              value={String(stats?.mvps ?? 0)}
              label={m.card.mvps}
              pending={pending}
            />,
          ]}
        </StatsRow>
        <Rule />
        {card.error ? (
          <Text size="meta" tone="muted" accessibilityRole="alert">
            {m.card.statsFailed}
          </Text>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text size="meta" tone="muted" style={{ flexShrink: 1 }}>
              {pending
                ? " "
                : form.length >= 5
                  ? m.card.lastFive
                  : form.length === 0
                    ? m.card.nonePlayed
                    : m.card.playedSoFar(form.length)}
            </Text>
            {pending ? null : <FormStrip form={form} />}
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {otherSideName ? (
            <View style={{ flex: 1 }}>
              <Button
                label={m.card.moveTo(otherSideName)}
                variant="outline"
                size="lg"
                onPress={onMove}
              />
            </View>
          ) : null}
          {canBeCaptain ? (
            <View style={{ flex: 1 }}>
              <Button
                label={isCaptain ? m.card.removeCaptain : m.card.makeCaptain}
                variant="outline"
                size="lg"
                onPress={onToggleCaptain}
              />
            </View>
          ) : null}
          {player.guest ? null : (
            <View style={{ flex: 1 }}>
              <Button
                label={m.card.fullProfile}
                size="lg"
                onPress={onOpenProfile}
              />
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
}
