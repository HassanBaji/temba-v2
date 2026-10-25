import {
  CLOSE_REGISTRATION_ACTION,
  EDIT_GAME_ACTION,
  KICK_ACTION,
  REOPEN_REGISTRATION_ACTION,
} from "@repo/domain/game-copy";
import type { FootballGameDetailsModel } from "@repo/domain/football-game-details";
import { Fragment } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
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
};

export function FootballOrganizerCard({
  organizer,
  waitlist,
  playersAllowed,
  handlers,
}: {
  organizer: NonNullable<FootballGameDetailsModel["organizer"]>;
  waitlist: FootballGameDetailsModel["waitlistRows"];
  playersAllowed: number | null;
  handlers: FootballOrganizerHandlers;
}) {
  const blocks: React.ReactNode[] = [
    <Block key="registration">
      <Text weight="medium">Registration</Text>
      <View style={{ flexDirection: "row" }}>
        <Button
          label={
            organizer.registration === "close"
              ? CLOSE_REGISTRATION_ACTION
              : REOPEN_REGISTRATION_ACTION
          }
          variant="outline"
          pending={handlers.registrationPending}
          onPress={handlers.onToggleRegistration}
        />
      </View>
    </Block>,
    <Block key="cap">
      <View>
        <Text weight="medium">Players allowed</Text>
        <Text size="meta" tone="muted">
          {playersAllowed ?? "No cap"}
        </Text>
      </View>
      <View style={{ flexDirection: "row" }}>
        <Button
          label="Change players allowed"
          variant="outline"
          onPress={handlers.onChangeCap}
        />
      </View>
    </Block>,
  ];

  if (waitlist.length > 0) {
    blocks.push(
      <Block key="waitlist">
        <Text weight="medium" accessibilityRole="header">
          Waitlist
        </Text>
        {waitlist.map((entry) => (
          <PersonRow key={entry.id} name={entry.name} image={entry.image}>
            <Button
              label={KICK_ACTION}
              accessibilityLabel={`${KICK_ACTION} ${entry.name} from the waitlist`}
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
          label={EDIT_GAME_ACTION}
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
