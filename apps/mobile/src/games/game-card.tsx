import {
  formatWindowDuration,
  formatGameCardDay,
} from "@repo/domain/format-game-start";
import {
  gameCardFormatCell,
  gameCardOpenSpots,
  gameCardSubtitle,
  type CardSeatPosition,
} from "@repo/domain/game-card";
import { gameFormatLabel } from "@repo/domain/game-format-label";
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
  const { primaryAction, rosterSides } = plan;
  const title = game.venue?.name ?? game.name ?? "Untitled Game";
  const subtitle = gameCardSubtitle(
    game.venue?.name,
    game.venue?.city ?? game.venue?.name,
    game.venue?.name ? game.name : null,
    game.courtName,
  );
  const roundLabel = poolRoundLabel(game.roundNumber, game.roundCount);
  const formatMeta = roundLabel ?? gameFormatLabel(game.format);
  const durationMeta = formatWindowDuration(game.windowStart, game.windowEnd);
  const levelMeta = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
  );
  const priceAmount = formatPricePerPlayerFils(game.pricePerPlayerFils);
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
  const dayLabel = formatGameCardDay(game.startTime);
  const kickoff = formatHomeKickoff(game.startTime);
  const countdown = formatHomeCountdown(game.startTime, now);
  const cancelled = game.registrationStatus === "cancelled";
  const viewerStatus = gameViewerStatus(game);
  const footerAction = showsGameCardFooterAction(primaryAction, showRoster)
    ? gameCardActionLabel(primaryAction, {
        viewerIn: viewerStatus === "in",
        openSpots,
      })
    : null;
  const interactive =
    primaryAction === "join_waitlist" || primaryAction === "register";
  const solid =
    footerAction != null && gameCardActionSolid(footerAction, primaryAction);

  return (
    <CardShell
      label={`${title}, ${dayLabel} ${kickoff.time} ${kickoff.meridiem}`}
      onPress={() => actions.onOpen(game.id)}
      footer={
        <CardFooter>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="meta" numberOfLines={1}>
              {formatMeta}
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
        {cancelled ? (
          <Text size="meta" weight="semibold">
            Cancelled
          </Text>
        ) : hasOpenCount ? (
          <Text
            size="meta"
            tone="muted"
            weight={openSpots > 0 ? "semibold" : "regular"}
          >
            {spotsOpenLabel(openSpots)}
          </Text>
        ) : null}
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
          {levelMeta ? <MetaCell value={levelMeta} note="Level" /> : null}
          {priceAmount ? (
            <MetaCell
              value={priceAmount}
              note={priceAmount === "Free" ? null : "per player"}
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
