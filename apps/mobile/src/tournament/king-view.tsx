import { spacing } from "@repo/design-tokens";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import { kingFullNames, kingPairName } from "@repo/domain/tournament-king";
import {
  kingFinishedView,
  kingStartingCourtRows,
  kingYourCourt,
  viewerKingTeam,
  type KingCourtRow,
  type KingViewTeam,
} from "@repo/domain/tournament-king-view";
import { Crown } from "lucide-react-native";
import { Fragment } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const ICON = 16;
const PLACE_WIDTH = 28;

function TeamNames({
  team,
  viewerUserId,
}: {
  team: KingViewTeam;
  viewerUserId: string;
}) {
  const you = useMessages().tournamentRounds.score.you;
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {team.members.map((member) => (
        <Text key={member.id} size="meta" weight="semibold" numberOfLines={1}>
          {member.name}
          {member.id === viewerUserId ? (
            <Text size="meta" tone="muted">
              {" "}
              {you}
            </Text>
          ) : null}
        </Text>
      ))}
    </View>
  );
}

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

/**
 * A drawn King of the court Game: the final order once it is posted, where
 * the viewer starts, and every starting court. Read only: the Organizer
 * draws the courts and posts the order on the web for now (ADR-0087).
 */
export function KingView({ game }: { game: TournamentDetails }) {
  const locale = useLocale();
  const colors = useColors();
  const messages = useMessages();
  const m = messages.tournamentKing;
  const finished =
    game.finalOrderPostedAt != null ? kingFinishedView(game, locale) : null;
  const yourCourt = kingYourCourt(game);
  const viewerTeam = viewerKingTeam(game.gameTeams, game.viewerUserId);
  const courts = kingStartingCourtRows(game);
  const tagLabel = (tag: KingCourtRow["tag"]) =>
    tag === "kings"
      ? m.court.kings
      : tag === "bottom"
        ? m.court.bottom
        : tag === "yours"
          ? m.court.yours
          : undefined;

  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 6 }}>
        <Text
          size="h1Lg"
          width="expanded"
          weight="bold"
          accessibilityRole="header"
        >
          {finished ? m.tabs.finalOrder : m.tabs.courts}
        </Text>
        <Text size="body">{finished?.name ?? game.name ?? m.shape.title}</Text>
        <Text size="meta" tone="muted">
          {finished ? finished.summary : m.lead.courts}
        </Text>
      </View>

      {finished ? (
        <View style={{ gap: 8 }}>
          <Card title={m.finalOrder.title}>
            {finished.order.map((row, index) => (
              <Fragment key={row.team.id}>
                {index > 0 ? <Hairline /> : null}
                <Row>
                  <Text
                    size="lead"
                    width="expanded"
                    weight="bold"
                    tone={row.place == null ? "muted" : "default"}
                    accessibilityLabel={
                      row.place == null ? m.finalOrder.notPlaced : undefined
                    }
                    style={{ width: PLACE_WIDTH }}
                  >
                    {row.place ?? "–"}
                  </Text>
                  <TeamNames team={row.team} viewerUserId={game.viewerUserId} />
                  {row.place === 1 ? (
                    <Crown
                      size={ICON}
                      color={colors.ink}
                      accessibilityLabel={m.finalOrder.king}
                    />
                  ) : null}
                </Row>
              </Fragment>
            ))}
          </Card>
          <Text size="meta" tone="muted">
            {m.finalOrder.note}
          </Text>
        </View>
      ) : null}

      {yourCourt && viewerTeam && !finished ? (
        <Card
          title={m.yourCourt.startOn(
            kingPairName(viewerTeam.members, game.viewerUserId, locale),
          )}
        >
          <View
            style={{
              paddingHorizontal: spacing.surface,
              paddingBottom: spacing.surface,
              gap: 8,
            }}
          >
            <Text size="display" width="expanded" weight="bold">
              {m.court.name(yourCourt.court)}
            </Text>
            {yourCourt.opponent ? (
              <Text>
                {m.yourCourt.against}{" "}
                <Text weight="semibold">
                  {kingFullNames(yourCourt.opponent.members)}
                </Text>
              </Text>
            ) : null}
          </View>
          <Hairline />
          <View
            style={{
              paddingHorizontal: spacing.surface,
              paddingVertical: 12,
              gap: 6,
            }}
          >
            <Text size="meta">
              {yourCourt.win.stays ? m.yourCourt.winStay : m.yourCourt.winUp}{" "}
              <Text size="meta" weight="semibold">
                {m.court.name(yourCourt.win.court)}
              </Text>
            </Text>
            <Text size="meta">
              {yourCourt.lose.stays
                ? m.yourCourt.loseStay
                : m.yourCourt.loseDown}{" "}
              <Text size="meta" weight="semibold">
                {m.court.name(yourCourt.lose.court)}
              </Text>
            </Text>
          </View>
        </Card>
      ) : null}

      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            size="h2"
            width="expanded"
            weight="bold"
            accessibilityRole="header"
          >
            {m.startingCourts.title}
          </Text>
          <Text size="meta" tone="muted">
            {m.startingCourts.meta}
          </Text>
        </View>
        {courts.map((court) => (
          <Card
            key={court.court}
            title={m.court.name(court.court)}
            meta={tagLabel(court.tag)}
            flush
          >
            {court.teams.map((team, index) => (
              <Fragment key={team.id}>
                {index > 0 ? <Hairline /> : null}
                <Row>
                  <TeamNames team={team} viewerUserId={game.viewerUserId} />
                </Row>
              </Fragment>
            ))}
          </Card>
        ))}
        <Text size="meta" tone="muted">
          {m.startingCourts.footer}
        </Text>
      </View>
    </View>
  );
}
