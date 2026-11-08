import {
  closeRegistrationAction,
  editGameAction,
  kickAction,
  reopenRegistrationAction,
} from "@repo/domain/game-copy";
import type { FootballGameDetailsModel } from "@repo/domain/football-game-details";
import { Fragment } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { Block, PersonRow } from "./organizer-card";

export type FootballOrganizerHandlers = {
  registrationPending: boolean;
  cancelPending: boolean;
  onToggleRegistration: () => void;
  onChangeCap: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onKickWaitlist: (waitlistId: string) => void;
  onAddPlayer?: () => void;
};

export function FootballOrganizerCard({
  organizer,
  waitlist,
  playersAllowed,
  teams,
  fixedShape = false,
  handlers,
}: {
  organizer: NonNullable<FootballGameDetailsModel["organizer"]>;
  waitlist: FootballGameDetailsModel["waitlistRows"];
  playersAllowed: number | null;
  teams: { status: string; actionLabel: string } | null;
  /** A Challenge Game: registration and the cap are the Challenge's. */
  fixedShape?: boolean;
  handlers: FootballOrganizerHandlers & { onMakeTeams: () => void };
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.mobileGameDetails.organizer;
  const blocks: React.ReactNode[] = [];
  if (teams) {
    blocks.push(
      <Block key="teams">
        <View>
          <Text weight="medium">{copy.teams}</Text>
          <Text size="meta" tone="muted">
            {teams.status}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Button label={teams.actionLabel} onPress={handlers.onMakeTeams} />
        </View>
      </Block>,
    );
  }
  if (handlers.onAddPlayer) {
    blocks.push(
      <Block key="add-player">
        <View>
          <Text weight="medium">{copy.players}</Text>
          <Text size="meta" tone="muted">
            {m.group.addPlayer.description}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Button
            label={m.group.addPlayer.action}
            variant="outline"
            onPress={handlers.onAddPlayer}
          />
        </View>
      </Block>,
    );
  }
  if (!fixedShape) {
    blocks.push(
      <Block key="registration">
        <Text weight="medium">{copy.registration}</Text>
        <View style={{ flexDirection: "row" }}>
          <Button
            label={
              organizer.registration === "close"
                ? closeRegistrationAction(locale)
                : reopenRegistrationAction(locale)
            }
            variant="outline"
            pending={handlers.registrationPending}
            onPress={handlers.onToggleRegistration}
          />
        </View>
      </Block>,
      <Block key="cap">
        <View>
          <Text weight="medium">{copy.playersAllowed}</Text>
          <Text size="meta" tone="muted">
            {playersAllowed ?? copy.noCap}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Button
            label={copy.changePlayersAllowed}
            variant="outline"
            onPress={handlers.onChangeCap}
          />
        </View>
      </Block>,
    );
  }

  if (waitlist.length > 0) {
    blocks.push(
      <Block key="waitlist">
        <Text weight="medium" accessibilityRole="header">
          {copy.waitlist}
        </Text>
        {waitlist.map((entry) => (
          <PersonRow key={entry.id} name={entry.name} image={entry.image}>
            <Button
              label={kickAction(locale)}
              accessibilityLabel={copy.kickFromWaitlist(entry.name)}
              size="sm"
              variant="outline"
              onPress={() => handlers.onKickWaitlist(entry.id)}
            />
          </PersonRow>
        ))}
      </Block>,
    );
  }

  blocks.push(
    <Block key="manage">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={editGameAction(locale)}
          variant="outline"
          onPress={handlers.onEdit}
        />
        <Button
          label={organizer.cancelLabel}
          variant="outline"
          pending={handlers.cancelPending}
          onPress={handlers.onCancel}
        />
      </View>
    </Block>,
  );

  return (
    <Card title={copy.title} flush>
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {index > 0 ? <Hairline /> : null}
          {block}
        </Fragment>
      ))}
    </Card>
  );
}
