import { spacing } from "@repo/design-tokens";
import { hubRegisterToast } from "@repo/domain/game-card";
import { shortPlayerName } from "@repo/domain/player-name";
import {
  americanoResultMark,
  signedDifference,
  viewerAmericanoMatches,
} from "@repo/domain/tournament-americano-view";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { SeriesBadge } from "../series/series-badge";
import { SeriesGameCard } from "../series/series-game-card";
import {
  SeriesHeroLine,
  type WithGameSeries,
} from "../series/series-hero-line";
import { useSeriesTableMarks } from "../series/use-series-table-marks";
import { api } from "../trpc/react";

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: 10,
      }}
    >
      {children}
    </View>
  );
}

/** A player's row; tapping it opens their actions or profile when allowed. */
function PlayerRow({
  userId,
  name,
  viewerUserId,
  onOpenPlayer,
  playerOpensActions,
  children,
}: {
  userId: string | null;
  name: string;
  viewerUserId: string;
  onOpenPlayer?: (userId: string) => void;
  playerOpensActions?: (userId: string) => boolean;
  children: React.ReactNode;
}) {
  const m = useMessages().mobileTournament.predraw;
  if (!onOpenPlayer || !userId || userId === viewerUserId) {
    return <Row>{children}</Row>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={
        playerOpensActions?.(userId)
          ? m.opensPlayerActionsHint
          : m.opensProfileHint
      }
      onPress={() => onOpenPlayer(userId)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Row>{children}</Row>
    </Pressable>
  );
}

/**
 * An Americano on the mobile App: the players before the Rounds are made,
 * then the one table of players and the viewer's Matches. Making the Rounds,
 * swapping players and entering scores happen on the web for now (ADR-0094).
 */
export function AmericanoView({
  game,
  onOpenPlayer,
  playerOpensActions,
}: {
  game: TournamentDetails & WithGameSeries;
  onOpenPlayer?: (userId: string) => void;
  playerOpensActions?: (userId: string) => boolean;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const toast = useToast();
  const utils = api.useUtils();
  const board = api.games.americanoBoard.useQuery({ gameId: game.id });
  const seriesMarks = useSeriesTableMarks(game.id, game.series != null);
  const register = api.games.register.useMutation({
    onSuccess: (result) =>
      toast.show(hubRegisterToast(result.waitlisted, locale)),
    onError: (error) => toast.show(error.message),
    onSettled: () =>
      Promise.all([
        utils.games.americanoBoard.invalidate({ gameId: game.id }),
        utils.games.byId.invalidate({ id: game.id }),
      ]),
  });
  const drawn = game.drawPostedAt != null;
  const players = board.data?.players ?? [];
  const names = new Map(players.map((player) => [player.gamePlayerId, player]));
  const viewerId = board.data?.viewerGamePlayerId ?? null;
  const seatCount = game.playersAllowed ?? 0;
  const canJoin =
    !drawn && !game.isRegistered && (game.canRegister || game.canWaitlist);
  const seriesCard = game.series ? (
    <SeriesGameCard gameId={game.id} game="social" />
  ) : null;

  if (!drawn) {
    return (
      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text
            size="h1Lg"
            width="expanded"
            weight="bold"
            accessibilityRole="header"
          >
            {game.name ?? m.shape.title}
          </Text>
          <Text size="meta" tone="muted">
            {m.hero.seats(game.registeredPlayers.length, seatCount)}.{" "}
            {m.drawEntry.waitingCopy(seatCount)}
          </Text>
          {game.series ? (
            <SeriesHeroLine series={game.series} style={{ marginTop: 6 }} />
          ) : null}
        </View>
        {seriesCard}
        <Card
          title={m.players.title}
          meta={m.players.count(game.registeredPlayers.length, seatCount)}
        >
          {game.registeredPlayers.map((player, index) => (
            <Fragment key={player.id}>
              {index > 0 ? <Hairline /> : null}
              <PlayerRow
                userId={player.id}
                name={player.name}
                viewerUserId={game.viewerUserId}
                onOpenPlayer={onOpenPlayer}
                playerOpensActions={playerOpensActions}
              >
                <Text size="meta" weight="semibold" numberOfLines={1}>
                  {player.id === game.viewerUserId
                    ? messages.common.you
                    : player.name}
                </Text>
              </PlayerRow>
            </Fragment>
          ))}
        </Card>
        {game.waitlist.length > 0 ? (
          <Card
            title={m.waitlist.title}
            meta={m.waitlist.count(game.waitlist.length)}
          >
            {game.waitlist.map((entry, index) => (
              <Fragment key={entry.id}>
                {index > 0 ? <Hairline /> : null}
                <Row>
                  <Text size="meta" tone="muted" style={{ width: 24 }}>
                    {index + 1}
                  </Text>
                  <Text size="meta" weight="semibold" numberOfLines={1}>
                    {entry.userId === game.viewerUserId
                      ? messages.common.you
                      : entry.name}
                  </Text>
                </Row>
              </Fragment>
            ))}
          </Card>
        ) : null}
        <Text size="meta" tone="muted">
          {game.isOrganizer ? m.mobile.webOnly : m.players.footPlayer}
        </Text>
        {canJoin ? (
          <Button
            label={game.canRegister ? m.join.takeSeat : m.join.joinWaitlist}
            pending={register.isPending}
            onPress={() => register.mutate({ gameId: game.id })}
          />
        ) : null}
      </View>
    );
  }

  const matches =
    board.data?.rounds.flatMap((round) =>
      round.matches.map((match) => ({
        ...match,
        roundNumber: round.roundNumber,
      })),
    ) ?? [];
  const played = viewerAmericanoMatches(matches, viewerId);
  const shortName = (id: string) =>
    id === viewerId
      ? messages.common.you
      : shortPlayerName(names.get(id)?.name ?? "");
  const finished = board.data?.finished ?? false;
  const wonSeries = (playerId: string) => {
    const userId = names.get(playerId)?.userId;
    return userId != null && seriesMarks?.userIds.has(userId) === true;
  };

  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 6 }}>
        <Text
          size="h1Lg"
          width="expanded"
          weight="bold"
          accessibilityRole="header"
        >
          {m.tabs.standings}
        </Text>
        <Text size="body">{game.name ?? m.shape.title}</Text>
        <Text size="meta" tone="muted">
          {m.lead.standings}
        </Text>
        {game.series && !finished ? (
          <SeriesHeroLine series={game.series} style={{ marginTop: 6 }} />
        ) : null}
      </View>
      {seriesCard}

      <View style={{ gap: 8 }}>
        <Card title={m.tabs.standings}>
          {(board.data?.table ?? []).map((row, index) => (
            <Fragment key={row.playerId}>
              {index > 0 ? <Hairline /> : null}
              <PlayerRow
                userId={names.get(row.playerId)?.userId ?? null}
                name={names.get(row.playerId)?.name ?? ""}
                viewerUserId={game.viewerUserId}
                onOpenPlayer={onOpenPlayer}
                playerOpensActions={playerOpensActions}
              >
                <Text size="meta" tone="muted" style={{ width: 24 }}>
                  {row.place}
                </Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="meta" weight="semibold" numberOfLines={1}>
                    {names.get(row.playerId)?.name}
                    {row.playerId === viewerId ? (
                      <Text size="meta" tone="muted">
                        {" "}
                        {m.table.you}
                      </Text>
                    ) : null}
                  </Text>
                </View>
                {seriesMarks && wonSeries(row.playerId) ? (
                  <SeriesBadge
                    emblem={seriesMarks.emblem}
                    colour={seriesMarks.colour}
                    size="line"
                  />
                ) : null}
                <Text size="meta" tone="muted">
                  {signedDifference(row.difference)}
                </Text>
                <Text size="lead" width="expanded" weight="bold">
                  {row.gamesWon}
                </Text>
              </PlayerRow>
            </Fragment>
          ))}
        </Card>
        <Text size="meta" tone="muted">
          {finished ? m.table.final : m.table.live}
        </Text>
        {seriesMarks ? (
          <Text size="meta" tone="muted">
            {seriesMarks.note}
          </Text>
        ) : null}
      </View>

      {played.length > 0 ? (
        <Card
          title={finished ? m.yourRounds.finishedTitle : m.yourRounds.title}
          meta={m.yourRounds.meta(played.length)}
        >
          {played.map((entry, index) => (
            <Fragment key={entry.match.matchId}>
              {index > 0 ? <Hairline /> : null}
              <Row>
                <ResultMark variant={americanoResultMark(entry.outcome)} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="meta" weight="semibold" numberOfLines={1}>
                    {m.yourRounds.with(
                      entry.partnerId
                        ? (names.get(entry.partnerId)?.name ?? "")
                        : "",
                    )}
                  </Text>
                  <Text size="meta" tone="muted" numberOfLines={1}>
                    {m.yourRounds.versus(
                      entry.opponentIds.map(shortName).join(" & "),
                    )}
                  </Text>
                </View>
                {entry.mine != null && entry.theirs != null ? (
                  <Text size="lead" width="expanded" weight="bold">
                    {`${entry.mine}–${entry.theirs}`}
                  </Text>
                ) : (
                  <Text size="meta" tone="muted">
                    {m.yourRounds.upcoming(entry.roundNumber)}
                  </Text>
                )}
              </Row>
            </Fragment>
          ))}
        </Card>
      ) : null}

      {finished ? null : (
        <Text size="meta" tone="muted">
          {m.mobile.webOnly}
        </Text>
      )}
    </View>
  );
}
