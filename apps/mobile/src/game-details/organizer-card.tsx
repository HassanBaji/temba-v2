import { spacing } from "@repo/design-tokens";
import {
  closeRegistrationAction,
  completeMatchAction,
  completeMatchConsequence,
  kickAction,
  reopenRegistrationAction,
} from "@repo/domain/game-copy";
import type { FriendlyGameOrganizerPlan } from "@repo/domain/friendly-game-organizer";
import { Fragment } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";

export type OrganizerHandlers = {
  registrationPending: boolean;
  completePending: boolean;
  decidingRequestId: string | null;
  onToggleRegistration: () => void;
  onChooseCourt: () => void;
  onComplete: (matchId: string) => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onKickWaitlist: (waitlistId: string) => void;
  onKickPlayer: (userId: string) => void;
  onAddPlayer: () => void;
};

export function Block({ children }: { children: React.ReactNode }) {
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

export function PersonRow({
  name,
  image,
  meta,
  children,
}: {
  name: string;
  image: string | null;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={name} uri={image} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="medium" numberOfLines={1}>
            {name}
          </Text>
          {meta ? (
            <Text size="meta" tone="muted" numberOfLines={2}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>{children}</View>
    </View>
  );
}

export function OrganizerCard({
  plan,
  handlers,
}: {
  plan: FriendlyGameOrganizerPlan;
  handlers: OrganizerHandlers;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.mobileGameDetails.organizer;
  const blocks: React.ReactNode[] = [
    <Block key="registration">
      <Text weight="medium">{copy.registration}</Text>
      <View style={{ flexDirection: "row" }}>
        <Button
          label={
            plan.registration === "close"
              ? closeRegistrationAction(locale)
              : reopenRegistrationAction(locale)
          }
          variant="outline"
          pending={handlers.registrationPending}
          onPress={handlers.onToggleRegistration}
        />
      </View>
    </Block>,
  ];

  if (plan.canAddPlayer) {
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

  if (plan.court) {
    blocks.push(
      <Block key="court">
        <View>
          <Text weight="medium">{copy.court}</Text>
          <Text size="meta" tone="muted">
            {plan.court.courtName ?? copy.noCourt}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Button
            label={copy.changeCourt}
            variant="outline"
            onPress={handlers.onChooseCourt}
          />
        </View>
      </Block>,
    );
  }

  if (plan.completeMatchId) {
    const matchId = plan.completeMatchId;
    blocks.push(
      <Block key="complete">
        <Text size="meta" tone="muted">
          {completeMatchConsequence(locale)}
        </Text>
        <View style={{ flexDirection: "row" }}>
          <Button
            label={completeMatchAction(locale)}
            variant="outline"
            pending={handlers.completePending}
            onPress={() => handlers.onComplete(matchId)}
          />
        </View>
      </Block>,
    );
  }

  if (plan.showLevelRequests) {
    blocks.push(
      <Block key="requests">
        <Text weight="medium" accessibilityRole="header">
          {copy.levelRequests}
        </Text>
        {plan.levelRequests.length === 0 ? (
          <Text size="meta" tone="muted">
            {copy.noLevelRequests}
          </Text>
        ) : (
          plan.levelRequests.map((request) => {
            const deciding = handlers.decidingRequestId === request.id;
            return (
              <PersonRow
                key={request.id}
                name={request.name}
                image={request.image}
                meta={request.meta}
              >
                <Button
                  label={copy.approve}
                  accessibilityLabel={copy.approveName(request.name)}
                  size="sm"
                  disabled={deciding}
                  onPress={() => handlers.onApprove(request.id)}
                />
                <Button
                  label={copy.reject}
                  accessibilityLabel={copy.rejectName(request.name)}
                  size="sm"
                  variant="outline"
                  disabled={deciding}
                  onPress={() => handlers.onReject(request.id)}
                />
              </PersonRow>
            );
          })
        )}
      </Block>,
    );
  }

  if (plan.waitlist.length > 0) {
    blocks.push(
      <Block key="waitlist">
        <Text weight="medium" accessibilityRole="header">
          {copy.waitlist}
        </Text>
        {plan.waitlist.map((entry) => (
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

  if (plan.unseated.length > 0) {
    blocks.push(
      <Block key="unseated">
        <Text weight="medium" accessibilityRole="header">
          {copy.notSeated}
        </Text>
        {plan.unseated.map((player) => (
          <PersonRow key={player.id} name={player.name} image={player.image}>
            <Button
              label={kickAction(locale)}
              accessibilityLabel={m.mobileGameDetails.lineup.kickName(
                player.name,
              )}
              size="sm"
              variant="outline"
              onPress={() => handlers.onKickPlayer(player.id)}
            />
          </PersonRow>
        ))}
      </Block>,
    );
  }

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
