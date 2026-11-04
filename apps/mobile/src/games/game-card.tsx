import {
  formatWindowDuration,
  formatGameCardDay,
} from "@repo/domain/format-game-start";
import {
  gameCardFormatCell,
  gameCardOpenSpots,
  gameCardRosterOccupancy,
  gameCardSubtitle,
  type CardSeatPosition,
} from "@repo/domain/game-card";
import { gameCustomName } from "@repo/domain/game-custom-name";
import { gameFormatLabel } from "@repo/domain/game-format-label";
import { ratingScopeTag } from "@repo/domain/game-rating-impact";
import { spotsOpenLabel } from "@repo/domain/game-occupancy";
import {
  gameCardActionLabel,
  gameCardActionSolid,
  gameViewerStatus,
  showsGameCardFooterAction,
} from "@repo/domain/game-summary-cta";
import {
  formatHomeCountdown,
  formatHomeKickoff,
} from "@repo/domain/home-countdown";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { formatLevelRangeLabel } from "@repo/domain/level-range";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { poolRoundLabel } from "@repo/domain/tournament-rounds";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { SportTag } from "../lib/sport-tag";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { CardFooter, CardShell, MetaCell } from "./card-parts";
import type { HubItem } from "./games-model";
import { FriendlyRoster } from "./seat-chips";
import { useNow } from "./use-now";

export type GameCardActions = {
  onOpen: (gameId: string) => void;
  onJoinSeat: (
    gameId: string,
    sideIndex: number,
    position: CardSeatPosition,
  ) => void;
  onJoinWaitlist: (game: HubGameRow) => void;
  onRegister: (gameId: string) => void;
};

export function GameCard({
  item,
  pending,
  actions,
}: {
  item: Extract<HubItem, { kind: "game" }>;
  pending: boolean;
  actions: GameCardActions;
}) {
  const { game, plan } = item;
  const now = useNow();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.card;
  const { primaryAction, rosterSides } = plan;
  const customName = gameCustomName(game);
  const title = game.venue?.name ?? customName ?? m.untitledGame;
  const subtitle = gameCardSubtitle(
    {
      venueName: game.venue?.name,
      location: game.venue?.city ?? game.venue?.name,
      customName: game.venue?.name ? customName : null,
      courtName: game.courtName,
      windowEnd: game.windowEnd,
    },
    locale,
  );
  const roundLabel = poolRoundLabel(game.roundNumber, game.roundCount, locale);
  const formatMeta = roundLabel ?? gameFormatLabel(game.format, locale);
  const ratingTag = ratingScopeTag(game, locale);
  const durationMeta = formatWindowDuration(
    game.windowStart,
    game.windowEnd,
    locale,
  );
  const levelMeta = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
    locale,
  );
  const priceAmount = formatPricePerPlayerFils(game.pricePerPlayerFils, locale);
  const formatCell = gameCardFormatCell({
    formatMeta,
    durationMeta,
    levelMeta,
  });
  const { showRoster, openSpots, hasOpenCount } = gameCardOpenSpots({
    sides: rosterSides,
    registeredUserCount: game.registeredUserCount,
    playersAllowed: game.playersAllowed,
  });
  const rosterOccupancy = gameCardRosterOccupancy(game);
  const dayLabel = formatGameCardDay(game.startTime, locale);
  const kickoff = formatHomeKickoff(game.startTime, locale);
  const countdown = formatHomeCountdown(game.startTime, now, locale);
  const cancelled = game.registrationStatus === "cancelled";
  const viewerStatus = gameViewerStatus(game);
  const footerAction = showsGameCardFooterAction(primaryAction, showRoster)
    ? gameCardActionLabel(primaryAction, locale, {
        viewerIn: viewerStatus === "in",
        openSpots,
      })
    : null;
  const interactive =
    primaryAction === "join_waitlist" || primaryAction === "register";
  const solid =
    footerAction != null &&
    gameCardActionSolid(footerAction, primaryAction, locale);

  return (
    <CardShell
      label={m.accessibleName(
        title,
        dayLabel,
        `${kickoff.time} ${kickoff.meridiem}`,
      )}
      onPress={() => actions.onOpen(game.id)}
      footer={
        <CardFooter>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="meta" numberOfLines={1}>
              {game.groupName ? messages.game.played.group : formatMeta}
            </Text>
            {game.groupName ? (
              <Text size="eyebrow" tone="muted" numberOfLines={1}>
                {game.groupName}
              </Text>
            ) : null}
          </View>
          {footerAction ? (
            <Button
              label={footerAction}
              size="sm"
              variant={solid ? "default" : "outline"}
              pending={pending && interactive}
              disabled={pending}
              onPress={() => {
                if (primaryAction === "join_waitlist") {
                  actions.onJoinWaitlist(game);
                } else if (primaryAction === "register") {
                  actions.onRegister(game.id);
                } else {
                  actions.onOpen(game.id);
                }
              }}
            />
          ) : null}
        </CardFooter>
      }
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="meta" tone="muted" weight="medium">
          {dayLabel}
        </Text>
        <View style={{ flexDirection: "row", columnGap: 12 }}>
          {ratingTag ? (
            <Text size="meta" weight="semibold" numberOfLines={1}>
              {ratingTag}
            </Text>
          ) : null}
          {cancelled ? (
            <Text size="meta" weight="semibold">
              {m.cancelled}
            </Text>
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <SportTag sport={game.sport} />
              {rosterOccupancy ? (
                <Text
                  size="meta"
                  tone="muted"
                  weight={
                    rosterOccupancy.seatsLeft > 0 ? "semibold" : "regular"
                  }
                  accessibilityLabel={m.playersSr(rosterOccupancy.label)}
                >
                  {rosterOccupancy.label}
                </Text>
              ) : hasOpenCount ? (
                <Text
                  size="meta"
                  tone="muted"
                  weight={openSpots > 0 ? "semibold" : "regular"}
                >
                  {spotsOpenLabel(openSpots, locale)}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View
        style={{ flexDirection: "row", alignItems: "baseline", columnGap: 8 }}
      >
        <Text size="h1" width="expanded" weight="bold">
          {kickoff.time}
        </Text>
        <Text size="title" tone="muted">
          {kickoff.meridiem}
        </Text>
        {countdown ? (
          <Text size="meta" tone="muted" style={{ marginLeft: "auto" }}>
            {countdown}
          </Text>
        ) : null}
      </View>

      <View>
        <Text size="lead" weight="semibold" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text size="meta" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {levelMeta || priceAmount || formatCell ? (
        <View style={{ flexDirection: "row", gap: 16 }}>
          {levelMeta ? (
            <MetaCell value={levelMeta} note={messages.common.level} />
          ) : null}
          {priceAmount ? (
            <MetaCell
              value={priceAmount}
              note={
                priceAmount === messages.createGame.price.free
                  ? null
                  : m.perPlayerNote
              }
            />
          ) : null}
          {formatCell ? (
            <MetaCell value={formatCell.value} note={formatCell.note} />
          ) : null}
        </View>
      ) : null}

      {showRoster && rosterSides ? (
        <FriendlyRoster
          sides={rosterSides}
          joinable={primaryAction === "join"}
          pending={pending}
          onJoin={(sideIndex, position) =>
            actions.onJoinSeat(game.id, sideIndex, position)
          }
        />
      ) : null}
    </CardShell>
  );
}
