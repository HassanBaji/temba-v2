import { spacing } from "@repo/design-tokens";
import { hubRegisterToast } from "@repo/domain/game-card";
import { shortPlayerName } from "@repo/domain/player-name";
import { viewerAmericanoGames } from "@repo/domain/tournament-americano-view";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import { Fragment } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
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

function signed(value: number) {
  if (value > 0) {
    return `+${value}`;
  }
  return value < 0 ? `−${Math.abs(value)}` : "0";
}

/**
 * An Americano on the mobile App: the players before the Rounds are made,
 * then the one table of players and the viewer's games. Making the Rounds,
 * swapping players and entering scores happen on the web for now (ADR-0094).
 */
export function AmericanoView({ game }: { game: TournamentDetails }) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const toast = useToast();
  const utils = api.useUtils();
  const board = api.games.americanoBoard.useQuery({ gameId: game.id });
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
        </View>
        <Card
          title={m.players.title}
          meta={m.players.count(game.registeredPlayers.length, seatCount)}
        >
          {game.registeredPlayers.map((player, index) => (
            <Fragment key={player.id}>
              {index > 0 ? <Hairline /> : null}
              <Row>
                <Text size="meta" weight="semibold" numberOfLines={1}>
                  {player.id === game.viewerUserId
                    ? messages.common.you
                    : player.name}
                </Text>
              </Row>
            </Fragment>
          ))}
        </Card>
        <Text size="meta" tone="muted">
          {m.players.footPlayer}
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
  const games = viewerAmericanoGames(matches, viewerId);
  const shortName = (id: string) =>
    id === viewerId
      ? messages.common.you
      : shortPlayerName(names.get(id)?.name ?? "");
  const finished = board.data?.finished ?? false;

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
      </View>

      <View style={{ gap: 8 }}>
        <Card title={m.tabs.standings}>
          {(board.data?.standings ?? []).map((row, index) => (
            <Fragment key={row.playerId}>
              {index > 0 ? <Hairline /> : null}
              <Row>
                <Text size="meta" tone="muted" style={{ width: 24 }}>
                  {row.place}
                </Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="meta" weight="semibold" numberOfLines={1}>
                    {names.get(row.playerId)?.name}
                    {row.playerId === viewerId ? (
                      <Text size="meta" tone="muted">
                        {" "}
                        {m.standings.you}
                      </Text>
                    ) : null}
                  </Text>
                </View>
                <Text size="meta" tone="muted">
                  {signed(row.difference)}
                </Text>
                <Text size="lead" width="expanded" weight="bold">
                  {row.gamesWon}
                </Text>
              </Row>
            </Fragment>
          ))}
        </Card>
        <Text size="meta" tone="muted">
          {finished ? m.standings.final : m.standings.live}
        </Text>
      </View>

      {games.length > 0 ? (
        <Card
          title={finished ? m.yourRounds.finishedTitle : m.yourRounds.title}
          meta={m.yourRounds.meta(games.length)}
        >
          {games.map((entry, index) => (
            <Fragment key={entry.match.matchId}>
              {index > 0 ? <Hairline /> : null}
              <Row>
                <ResultMark
                  variant={
                    entry.outcome === "drawn"
                      ? "draw"
                      : (entry.outcome ?? "not-played")
                  }
                />
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
