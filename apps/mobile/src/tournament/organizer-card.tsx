import { spacing } from "@repo/design-tokens";
import { organizerCanAddPlayer } from "@repo/domain/add-player-by-phone";
import { canEditTeams } from "@repo/domain/edit-teams";
import { kickAction } from "@repo/domain/game-copy";
import type {
  TournamentDetails,
  TournamentHomeView,
} from "@repo/domain/tournament-details";
import {
  mergeCompletesTheField,
  mergeManyHalfTeamsCopy,
  mergePairCopy,
} from "@repo/domain/tournament-half-teams";
import {
  tournamentRoundsPlan,
  type TournamentOrganizerView,
} from "@repo/domain/tournament-organizer";
import { hasDraftKnockoutDraw } from "@repo/domain/tournament-knockout-view";
import {
  drawEntryStateLine,
  drawEntryTitle,
  hasDraftPoolDraw,
} from "@repo/domain/tournament-pool-draw";
import { roundCountLabel } from "@repo/domain/tournament-sizing";
import { Fragment } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";

export type OrganizerCardHandlers = {
  knockoutOnly: boolean;
  undoPending: boolean;
  kickPending: boolean;
  onOpenMerge: () => void;
  onOpenDraw: () => void;
  onOpenRounds: () => void;
  onUndo: () => void;
  onKickPlayer: (userId: string) => void;
  onKickWaitlist: (waitlistId: string) => void;
  onAddPlayer: () => void;
  onEditTeams: () => void;
};

function Block({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.surface,
        paddingVertical: 12,
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}

function Action({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row" }}>{children}</View>;
}

export function OrganizerCard({
  game,
  home,
  organizer,
  handlers,
}: {
  game: TournamentDetails;
  home: TournamentHomeView;
  organizer: TournamentOrganizerView;
  handlers: OrganizerCardHandlers;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const halfTeamsCopy = messages.tournament.halfTeams;
  const poolDraw = messages.tournament.poolDraw;
  const m = messages.mobileTournament.organizer;
  const kick = kickAction(locale);
  const { knockoutOnly } = handlers;
  const blocks: React.ReactNode[] = [];

  if (organizer.merge) {
    const [first, second] = organizer.halfTeams;
    const banner = organizer.merge === "banner" && first && second;
    blocks.push(
      <Block key="merge">
        <Text weight="medium">
          {banner ? halfTeamsCopy.bannerTitle : halfTeamsCopy.manyTitle}
        </Text>
        <Text size="meta" tone="muted">
          {banner
            ? mergePairCopy({
                firstName: first.occupant.name,
                secondName: second.occupant.name,
                completesField: mergeCompletesTheField(organizer.halfTeams),
                teamCount: game.teamsAllowed,
                locale,
              })
            : mergeManyHalfTeamsCopy(organizer.halfTeams.length, locale)}
        </Text>
        <Action>
          <Button
            label={
              banner ? halfTeamsCopy.bannerAction : halfTeamsCopy.mergeSeats
            }
            variant={banner ? "default" : "outline"}
            onPress={handlers.onOpenMerge}
          />
        </Action>
      </Block>,
    );
  }

  if (
    home.kingOfTheCourt &&
    organizer.active &&
    game.finalOrderPostedAt == null
  ) {
    blocks.push(
      <Block key="king">
        <Text weight="medium">{messages.tournamentKing.shape.title}</Text>
        <Text size="meta" tone="muted">
          {m.kingOnWeb}
        </Text>
      </Block>,
    );
  } else if (organizer.showDrawEntry) {
    const hasDraft = knockoutOnly
      ? hasDraftKnockoutDraw(game.gameTeams)
      : hasDraftPoolDraw(game.gameTeams);
    blocks.push(
      <Block key="draw">
        <Text weight="medium">
          {drawEntryTitle(hasDraft, locale, knockoutOnly)}
        </Text>
        <Text size="meta" tone="muted">
          {drawEntryStateLine(
            home.field.full,
            game.teamsAllowed ?? game.sides.length,
            locale,
          )}
        </Text>
        <Action>
          <Button
            label={poolDraw.entryAction}
            variant="outline"
            onPress={handlers.onOpenDraw}
          />
        </Action>
      </Block>,
    );
  }

  const rounds = organizer.active
    ? tournamentRoundsPlan(game, game.roundCount)
    : null;
  if (rounds) {
    blocks.push(
      <Block key="rounds">
        <View>
          <Text weight="medium">{messages.tournament.sizing.roundsLabel}</Text>
          <Text size="meta" tone="muted">
            {roundCountLabel(rounds.roundCount, locale)}
          </Text>
        </View>
        <Action>
          <Button
            label={m.changeRounds}
            variant="outline"
            onPress={handlers.onOpenRounds}
          />
        </Action>
      </Block>,
    );
  }

  if (organizer.showUndo) {
    blocks.push(
      <Block key="undo">
        <Action>
          <Button
            label={knockoutOnly ? poolDraw.undoKnockout : poolDraw.undo}
            variant="outline"
            pending={handlers.undoPending}
            onPress={handlers.onUndo}
          />
        </Action>
      </Block>,
    );
  }

  if (canEditTeams(game)) {
    blocks.push(
      <Block key="edit-teams">
        <Text size="meta" tone="muted">
          {messages.editTeams.tournamentCardCopy}
        </Text>
        <Action>
          <Button
            label={messages.editTeams.action}
            variant="outline"
            onPress={handlers.onEditTeams}
          />
        </Action>
      </Block>,
    );
  }

  if (organizerCanAddPlayer(game)) {
    blocks.push(
      <Block key="add-player">
        <Text size="meta" tone="muted">
          {messages.group.addPlayer.description}
        </Text>
        <Action>
          <Button
            label={messages.group.addPlayer.action}
            variant="outline"
            onPress={handlers.onAddPlayer}
          />
        </Action>
      </Block>,
    );
  }

  const waitlist = organizer.active ? game.waitlist : [];
  if (waitlist.length > 0) {
    blocks.push(
      <Block key="kick">
        <Text weight="medium" accessibilityRole="header">
          {messages.common.players}
        </Text>
        {waitlist.map((entry) => (
          <View
            key={entry.id}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
              {m.waitlistEntry(entry.name)}
            </Text>
            <Button
              label={kick}
              accessibilityLabel={m.kickFromWaitlistSr(entry.name)}
              size="sm"
              variant="outline"
              disabled={handlers.kickPending}
              onPress={() => handlers.onKickWaitlist(entry.id)}
            />
          </View>
        ))}
      </Block>,
    );
  }

  if (blocks.length === 0) {
    return null;
  }

  return (
    <Card title={messages.tournament.home.organizerRow} flush>
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {index > 0 ? <Hairline /> : null}
          {block}
        </Fragment>
      ))}
    </Card>
  );
}
