import { radii } from "@repo/design-tokens";
import {
  formatGameCardDay,
  formatRelativeDay,
} from "@repo/domain/format-game-start";
import {
  formatHomeCountdown,
  formatHomeKickoff,
} from "@repo/domain/home-countdown";
import { unratedLabel } from "@repo/domain/game-rating-impact";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { formatLevelRangeLabel } from "@repo/domain/level-range";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import {
  showsTournamentOpenFlag,
  tournamentCardAction,
  tournamentCardActionLabel,
  tournamentCardBandMeta,
  tournamentCardDateLine,
  tournamentCardKnockoutLine,
  tournamentCardPairs,
  tournamentMatchActionLabel,
  tournamentMatchLastResultLine,
  tournamentMatchRoundLabel,
  tournamentMatchRoundLine,
  tournamentMatchStandingLine,
  tournamentMatchStatus,
  tournamentMatchup,
  tournamentMatchupName,
  tournamentMatchVenueLine,
  tournamentOpenFlagLabel,
  tournamentOpenTeamCount,
  tournamentTeamPairLabel,
  tournamentTeamsLine,
} from "@repo/domain/tournament-card";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { CardBand, CardFooter, CardShell } from "./card-parts";
import type { GameCardActions } from "./game-card";
import { useNow } from "./use-now";

type Occupant = HubGameRow["sides"][number]["left"];
type TournamentTeam = NonNullable<HubGameRow["tournament"]>["teams"][number];

const PAIR_SQUARE = 28;

function PairSquare({ occupant }: { occupant: Occupant }) {
  if (!occupant) {
    return (
      <View style={{ width: PAIR_SQUARE, height: PAIR_SQUARE }}>
        <Hatch radius={radii.slot} />
      </View>
    );
  }
  return <Avatar name={occupant.name} uri={occupant.image} size="default" />;
}

function Pair({
  left,
  right,
  label,
}: {
  left: Occupant;
  right: Occupant;
  label: string | null;
}) {
  return (
    <View
      accessible
      accessibilityLabel={label ?? undefined}
      style={{ flexDirection: "row", gap: 2 }}
    >
      <PairSquare occupant={left} />
      <PairSquare occupant={right} />
    </View>
  );
}

function TeamPairs({
  teams,
  teamsAllowed,
  registrationOpen,
}: {
  teams: readonly TournamentTeam[];
  teamsAllowed: number | null;
  registrationOpen: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const { shown, remaining, placeholders } = tournamentCardPairs(teams, {
    teamsAllowed,
    registrationOpen,
  });
  if (shown.length === 0 && placeholders === 0) {
    return (
      <Text size="meta" tone="muted">
        {m.tournament.card.noTeamsYet}
      </Text>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
      }}
    >
      {shown.map((team) => (
        <Pair
          key={team.gameTeamId}
          left={team.left}
          right={team.right}
          label={tournamentTeamPairLabel(team, locale)}
        />
      ))}
      {Array.from({ length: placeholders }, (_, index) => (
        <Pair
          key={`open-${index}`}
          left={null}
          right={null}
          label={m.mobileTournament.card.openTeam}
        />
      ))}
      {remaining > 0 ? (
        <Text size="meta" tone="muted">
          +{remaining}
        </Text>
      ) : null}
    </View>
  );
}

export function TournamentCard({
  game,
  pending,
  actions,
  onPickSeat,
}: {
  game: HubGameRow;
  pending: boolean;
  actions: GameCardActions;
  onPickSeat: (game: HubGameRow) => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.card;
  const tournament = game.tournament;
  const teams = tournament?.teams ?? [];
  const title = game.name ?? game.venue?.name ?? m.untitledGame;
  const dateLine = tournamentCardDateLine(
    game.windowStart,
    game.windowEnd,
    locale,
  );
  const levelLabel = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
    locale,
  );
  const subLine = [
    game.venue?.name,
    levelLabel ? m.levelSubline(levelLabel) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const cancelled = game.registrationStatus === "cancelled";
  const action = tournamentCardAction(game);
  const interactive = action === "join" || action === "join_waitlist";
  const knockoutLine = tournamentCardKnockoutLine(game, locale);
  const openFlag = showsTournamentOpenFlag(game);
  const amount = formatPricePerPlayerFils(game.pricePerPlayerFils, locale);
  const bandLabel = messages.tournament.card.bandLabel;

  return (
    <CardShell
      label={[title, bandLabel, dateLine].filter(Boolean).join(", ")}
      onPress={() => actions.onOpen(game.id)}
      footer={
        <CardFooter>
          <View style={{ flex: 1, minWidth: 0, flexDirection: "row", gap: 6 }}>
            {amount ? (
              <Text size="lead" weight="bold" numberOfLines={1}>
                {amount === messages.createGame.price.free
                  ? amount
                  : m.perPlayer(amount)}
              </Text>
            ) : null}
          </View>
          <Button
            label={tournamentCardActionLabel(action, locale)}
            size="sm"
            variant={
              interactive || action === "invite_partner" ? "default" : "outline"
            }
            pending={pending}
            onPress={() => {
              if (action === "join") {
                onPickSeat(game);
              } else if (action === "join_waitlist") {
                actions.onJoinWaitlist(game);
              } else {
                actions.onOpen(game.id);
              }
            }}
          />
        </CardFooter>
      }
    >
      <CardBand
        label={bandLabel}
        meta={tournamentCardBandMeta(tournament?.roundCount, locale, game)}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          size="meta"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {game.windowStart
            ? m.starts(formatGameCardDay(game.windowStart, locale))
            : ""}
        </Text>
        <View style={{ flexDirection: "row", columnGap: 12 }}>
          {game.rated ? null : (
            <Text size="meta" weight="semibold">
              {unratedLabel(locale)}
            </Text>
          )}
          {cancelled ? (
            <Text size="meta" weight="semibold">
              {m.cancelled}
            </Text>
          ) : openFlag ? (
            <Text size="meta" weight="semibold">
              {tournamentOpenFlagLabel(
                tournamentOpenTeamCount(game.teamsAllowed, teams),
                locale,
              )}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Text size="h2" width="expanded" weight="bold" numberOfLines={2}>
          {title}
        </Text>
        {dateLine ? <Text>{dateLine}</Text> : null}
        {subLine ? (
          <Text size="meta" tone="muted" numberOfLines={1}>
            {subLine}
          </Text>
        ) : null}
        {knockoutLine ? (
          <Text weight="semibold" numberOfLines={1}>
            {knockoutLine}
          </Text>
        ) : null}
      </View>
      <Hairline />
      <Text size="meta" tone="muted">
        {tournamentTeamsLine(game, locale)}
      </Text>
      <TeamPairs
        teams={teams}
        teamsAllowed={game.teamsAllowed}
        registrationOpen={openFlag}
      />
    </CardShell>
  );
}

function MatchupColumn({
  side,
  isViewerSide,
}: {
  side: HubGameRow["sides"][number] | null;
  isViewerSide: boolean;
}) {
  const locale = useLocale();
  const name = tournamentMatchupName(side, locale);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        gap: 6,
        alignItems: isViewerSide ? "flex-start" : "flex-end",
      }}
    >
      <Pair
        left={side?.left ?? null}
        right={side?.right ?? null}
        label={name}
      />
      {name ? (
        <Text
          size="meta"
          tone={isViewerSide ? "default" : "muted"}
          weight={isViewerSide ? "semibold" : "regular"}
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {name}
        </Text>
      ) : null}
    </View>
  );
}

function Matchup({ sides }: { sides: HubGameRow["sides"] }) {
  const m = useMessages().mobileTournament.card;
  const { viewer, opponent } = tournamentMatchup(sides);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <MatchupColumn side={viewer} isViewerSide={viewer != null} />
      <Text size="eyebrow" tone="muted" accessibilityElementsHidden>
        {m.vs}
      </Text>
      <MatchupColumn side={opponent} isViewerSide={false} />
    </View>
  );
}

export function TournamentMatchCard({
  game,
  actions,
}: {
  game: HubGameRow;
  actions: GameCardActions;
}) {
  const now = useNow();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.card;
  const kickoff = formatHomeKickoff(game.startTime, locale);
  const day = formatRelativeDay(game.startTime, locale, {
    sameDayLabel: "Tonight",
  });
  const status = tournamentMatchStatus(
    undefined,
    formatHomeCountdown(game.startTime, now, locale),
    locale,
  );
  const title = game.name ?? game.venue?.name ?? m.untitledGame;
  const roundLine = tournamentMatchRoundLine(
    game.roundNumber,
    game.poolMatch,
    locale,
    game.knockoutMatch,
  );
  const venueLine = tournamentMatchVenueLine(
    game.venue?.name,
    game.courtName,
    locale,
  );
  const standingLine = tournamentMatchStandingLine(game.poolMatch, locale);
  const lastResultLine = tournamentMatchLastResultLine(
    game.poolMatch?.lastResult,
    locale,
  );

  return (
    <CardShell
      label={[title, roundLine, `${kickoff.time} ${kickoff.meridiem}`, day]
        .filter(Boolean)
        .join(", ")}
      onPress={() => actions.onOpen(game.id)}
      footer={
        <CardFooter>
          <Text size="meta" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {lastResultLine}
          </Text>
          <Button
            label={tournamentMatchActionLabel("view", locale)}
            size="sm"
            variant="outline"
            onPress={() => actions.onOpen(game.id)}
          />
        </CardFooter>
      }
    >
      <CardBand
        label={messages.tournament.card.matchBandLabel}
        meta={tournamentMatchRoundLabel(game, locale)}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>
            {title}
          </Text>
          {roundLine ? (
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {roundLine}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", columnGap: 12 }}>
          {game.rated ? null : (
            <Text size="meta" weight="semibold">
              {unratedLabel(locale)}
            </Text>
          )}
          {status ? (
            <Text size="meta" tone="muted">
              {status}
            </Text>
          ) : null}
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "baseline",
          columnGap: 8,
        }}
      >
        <Text size="display" width="expanded" weight="bold">
          {kickoff.time}
        </Text>
        <Text size="title" tone="muted">
          {kickoff.meridiem}
        </Text>
        <Text weight="medium">{day}</Text>
      </View>
      {venueLine ? (
        <Text size="meta" tone="muted" numberOfLines={1}>
          {venueLine}
        </Text>
      ) : null}
      <Hairline />
      <Matchup sides={game.sides} />
      {standingLine ? (
        <>
          <Hairline />
          <Text size="meta" tone="muted">
            {standingLine}
          </Text>
        </>
      ) : null}
    </CardShell>
  );
}
