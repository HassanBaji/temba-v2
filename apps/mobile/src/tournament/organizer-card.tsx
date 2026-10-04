import { spacing } from "@repo/design-tokens";
import { KICK_ACTION } from "@repo/domain/game-copy";
import type {
  TournamentDetails,
  TournamentHomeView,
} from "@repo/domain/tournament-details";
import {
  MERGE_BANNER_ACTION_LABEL,
  MERGE_BANNER_TITLE,
  MERGE_MANY_TITLE,
  MERGE_SEATS_ACTION_LABEL,
  mergeCompletesTheField,
  mergeManyHalfTeamsCopy,
  mergePairCopy,
} from "@repo/domain/tournament-half-teams";
import {
  kickableTournamentOccupants,
  tournamentRoundsPlan,
  type TournamentOrganizerView,
} from "@repo/domain/tournament-organizer";
import { hasDraftKnockoutDraw } from "@repo/domain/tournament-knockout-view";
import {
  DRAW_ENTRY_ACTION_LABEL,
  UNDO_KNOCKOUT_DRAW_ACTION,
  UNDO_POOL_DRAW_ACTION,
  drawEntryStateLine,
  drawEntryTitle,
  hasDraftPoolDraw,
} from "@repo/domain/tournament-pool-draw";
import { roundCountLabel } from "@repo/domain/tournament-sizing";
import { Fragment } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
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
  const { knockoutOnly } = handlers;
  const blocks: React.ReactNode[] = [];

  if (organizer.merge) {
    const [first, second] = organizer.halfTeams;
    const banner = organizer.merge === "banner" && first && second;
    blocks.push(
      <Block key="merge">
        <Text weight="medium">
          {banner ? MERGE_BANNER_TITLE : MERGE_MANY_TITLE}
        </Text>
        <Text size="meta" tone="muted">
          {banner
            ? mergePairCopy({
                firstName: first.occupant.name,
                secondName: second.occupant.name,
                completesField: mergeCompletesTheField(organizer.halfTeams),
                teamCount: game.teamsAllowed,
              })
            : mergeManyHalfTeamsCopy(organizer.halfTeams.length)}
        </Text>
        <Action>
          <Button
            label={
              banner ? MERGE_BANNER_ACTION_LABEL : MERGE_SEATS_ACTION_LABEL
            }
            variant={banner ? "default" : "outline"}
            onPress={handlers.onOpenMerge}
          />
        </Action>
      </Block>,
    );
  }

  if (organizer.showDrawEntry) {
    const hasDraft = knockoutOnly
      ? hasDraftKnockoutDraw(game.gameTeams)
      : hasDraftPoolDraw(game.gameTeams);
    blocks.push(
      <Block key="draw">
        <Text weight="medium">{drawEntryTitle(hasDraft, knockoutOnly)}</Text>
        <Text size="meta" tone="muted">
          {drawEntryStateLine(
            home.field.full,
            game.teamsAllowed ?? game.sides.length,
          )}
        </Text>
        <Action>
          <Button
            label={DRAW_ENTRY_ACTION_LABEL}
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
          <Text weight="medium">Rounds</Text>
          <Text size="meta" tone="muted">
            {roundCountLabel(rounds.roundCount)}
          </Text>
        </View>
        <Action>
          <Button
            label="Change Rounds"
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
            label={
              knockoutOnly ? UNDO_KNOCKOUT_DRAW_ACTION : UNDO_POOL_DRAW_ACTION
            }
            variant="outline"
            pending={handlers.undoPending}
            onPress={handlers.onUndo}
          />
        </Action>
      </Block>,
    );
  }

  const occupants = organizer.active ? kickableTournamentOccupants(game) : [];
  const waitlist = organizer.active ? game.waitlist : [];
  if (occupants.length > 0 || waitlist.length > 0) {
    blocks.push(
      <Block key="kick">
        <Text weight="medium" accessibilityRole="header">
          Players
        </Text>
        {occupants.map((occupant) => (
          <View
            key={occupant.userId}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
              {occupant.name}
            </Text>
            <Button
              label={KICK_ACTION}
              accessibilityLabel={`${KICK_ACTION} ${occupant.name}`}
              size="sm"
              variant="outline"
              disabled={handlers.kickPending}
              onPress={() => handlers.onKickPlayer(occupant.userId)}
            />
          </View>
        ))}
        {waitlist.map((entry) => (
          <View
            key={entry.id}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
              {`${entry.name} (waitlist)`}
            </Text>
            <Button
              label={KICK_ACTION}
              accessibilityLabel={`${KICK_ACTION} ${entry.name} from the waitlist`}
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
    <Card title="Organizer" flush>
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {index > 0 ? <Hairline /> : null}
          {block}
        </Fragment>
      ))}
    </Card>
  );
}
