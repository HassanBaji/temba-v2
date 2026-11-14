import { radii, spacing } from "@repo/design-tokens";
import { kickAction } from "@repo/domain/game-copy";
import type { FriendlyGameOrganizerPlan } from "@repo/domain/friendly-game-organizer";
import {
  requestsQueueCounts,
  type OrganizerRequest,
} from "@repo/domain/game-requests";
import { requestsQueueHeading } from "@repo/domain/seat-hold-request";
import { Fragment } from "react";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  gameRequestRows,
  waitingQueueCounts,
} from "../requests/request-answers-model";
import { useRequestAnswers } from "../requests/request-answers-provider";
import { RequestRowItem } from "../requests/request-card";
import type { RequestDecisions } from "./use-request-decisions";

export type OrganizerHandlers = {
  registrationPending: boolean;
  completePending: boolean;
  decidingRequestId: string | null;
  onToggleRegistration: () => void;
  onChooseCourt: () => void;
  onComplete: (matchId: string) => void;
  onApprove: (request: OrganizerRequest) => void;
  onReject: (request: OrganizerRequest) => void;
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

function RequestRow({
  request,
  deciding,
  handlers,
}: {
  request: OrganizerRequest;
  deciding: boolean;
  handlers: Pick<RequestDecisions, "onApprove" | "onReject">;
}) {
  const m = useMessages();
  const copy = m.mobileGameDetails.organizer;
  return (
    <View style={{ gap: 12, padding: spacing.surface }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <Avatar
          name={request.name}
          uri={request.image}
          size="lg"
          radius={radii.md}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Text weight="semibold" numberOfLines={1}>
              {request.name}
            </Text>
            {request.level ? (
              <Text weight="bold" width="expanded">
                {request.level}
              </Text>
            ) : null}
          </View>
          <Text size="meta" tone="muted">
            {request.detail}
          </Text>
        </View>
        {request.held ? (
          <Text size="meta" tone="muted">
            {request.held}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={copy.approve}
            accessibilityLabel={copy.approveName(request.name)}
            disabled={deciding}
            pending={deciding}
            onPress={() => handlers.onApprove(request)}
          />
        </View>
        <Button
          label={m.game.requests.decline}
          accessibilityLabel={copy.rejectName(request.name)}
          variant="outline"
          disabled={deciding}
          onPress={() => handlers.onReject(request)}
        />
      </View>
    </View>
  );
}

/**
 * The Game's Requests queue (design "Requests" 3a): the same card as Home and
 * Notifications, answered through the shared answers. A request the waiting
 * list does not carry, such as one on a Challenge Game, keeps its own row.
 */
export function RequestsSection({
  gameId,
  groupName,
  requests,
  decisions,
}: {
  gameId: string;
  groupName: string | null;
  requests: readonly OrganizerRequest[];
  decisions: RequestDecisions;
}) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const answers = useRequestAnswers();
  const rows = gameRequestRows(answers.rows, gameId);
  const shown = new Set(rows.map((row) => row.request.id));
  const own = requests.filter((request) => !shown.has(request.id));
  const waiting = waitingQueueCounts(rows);
  const ownCounts = requestsQueueCounts(own);
  const counts = {
    levelRange: waiting.levelRange + ownCounts.levelRange,
    seatHolds: waiting.seatHolds + ownCounts.seatHolds,
  };
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="h2" weight="bold" accessibilityRole="header">
          {m.game.requests.title}
        </Text>
        <Text size="meta" tone="muted" style={{ flexShrink: 1 }}>
          {requestsQueueHeading(counts, locale)}
        </Text>
      </View>
      {rows.length + own.length > 0 ? (
        <>
          <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
            {rows.map((row, index) => (
              <Fragment key={row.request.id}>
                {index > 0 ? <Hairline /> : null}
                <RequestRowItem row={row} now={now} />
              </Fragment>
            ))}
            {own.map((request, index) => (
              <Fragment key={request.id}>
                {rows.length + index > 0 ? <Hairline /> : null}
                <RequestRow
                  request={request}
                  deciding={decisions.decidingRequestId === request.id}
                  handlers={decisions}
                />
              </Fragment>
            ))}
          </Surface>
          <Text size="eyebrow" tone="muted">
            {groupName
              ? m.requests.gameNote(groupName)
              : m.requests.gameNoteNoGroup}
          </Text>
        </>
      ) : null}
    </View>
  );
}

/** The Organizer's queues: Level range requests, the waitlist, anyone not seated. */
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
  const blocks: React.ReactNode[] = [];

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

  if (blocks.length === 0) {
    return null;
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
