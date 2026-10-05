import { spacing } from "@repo/design-tokens";
import {
  INVITE_JOIN_WAITLIST_LABEL,
  gameInviteLinkStage,
  gameInviteSeatCopy,
  gameInviteSeatState,
  inviteKindLabel,
  levelRangeGateAction,
  type GameInviteLinkReady,
  type InviteKind,
  type InviteLinkPreview,
} from "@repo/domain/invites";
import {
  inviteOutcomeAction,
  inviteOutcomeCopy,
  type InviteOutcomeKind,
} from "@repo/domain/invite-outcome-copy";
import {
  formatLevelRangeGateCopy,
  formatLevelRangeLabel,
} from "@repo/domain/level-range";
import {
  PARTNER_REQUIRED_INVITE_LANDING_COPY,
  PARTNER_REQUIRED_INVITE_LANDING_CTA,
} from "@repo/domain/tournament-join";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { SeatChoice } from "./seat-choice";

export type InviteLinkViewProps = {
  kind: InviteKind;
  preview: Slot<InviteLinkPreview>;
  acceptPending: boolean;
  requestPending: boolean;
  waitingForPartner: boolean;
  onAccept: (seat?: { sideIndex: number; position: "left" | "right" }) => void;
  onRequestLevel: (gameId: string) => void;
  onPickPartner: (gameId: string) => void;
  onGoHome: () => void;
  onRetry: () => void;
};

function Outcome({
  outcome,
  kind,
  onGoHome,
}: {
  outcome: InviteOutcomeKind;
  kind: InviteKind;
  onGoHome: () => void;
}) {
  const copy = inviteOutcomeCopy(outcome, inviteKindLabel(kind));
  const action = inviteOutcomeAction(true);
  return (
    <Surface style={{ gap: 8 }}>
      <Text size="h2" weight="bold" accessibilityRole="header">
        {copy.title}
      </Text>
      <Text tone="muted">{copy.description}</Text>
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        <Button label={action.label} variant="outline" onPress={onGoHome} />
      </View>
    </Surface>
  );
}

function Hero({
  kind,
  name,
  note,
}: {
  kind: InviteKind;
  name: string;
  note?: string | null;
}) {
  return (
    <Surface tone="ink" style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={name} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="h2" weight="bold" accessibilityRole="header">
            Join {name}
          </Text>
          <Text size="eyebrow" tone="muted" mono uppercase>
            {inviteKindLabel(kind)}
          </Text>
        </View>
      </View>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Surface>
  );
}

function SimpleReady({
  kind,
  name,
  pending,
  onAccept,
}: {
  kind: InviteKind;
  name: string;
  pending: boolean;
  onAccept: InviteLinkViewProps["onAccept"];
}) {
  return (
    <View style={{ gap: spacing.compact }}>
      <Hero kind={kind} name={name} />
      <View style={{ flexDirection: "row" }}>
        <Button
          label={`Join ${name}`}
          size="lg"
          pending={pending}
          onPress={() => onAccept()}
        />
      </View>
    </View>
  );
}

function GameReady({
  game,
  props,
}: {
  game: GameInviteLinkReady;
  props: InviteLinkViewProps;
}) {
  const name = game.gameName ?? "Game";
  const rangeLabel = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
  );
  const stage = gameInviteLinkStage(game, true);
  const seatState = gameInviteSeatState({
    registrationStatus: game.registrationStatus,
    vacantSeatCount: game.vacantSeats.length,
  });

  if (stage === "level_range") {
    const action = levelRangeGateAction({
      requestStatus: game.levelRangeRequest?.status ?? null,
      canRequest: game.canRequestLevelRange,
      requesting: props.requestPending,
    });
    return (
      <View style={{ gap: spacing.compact }}>
        <Hero
          kind="game"
          name={name}
          note={[rangeLabel, formatLevelRangeGateCopy(game)]
            .filter(Boolean)
            .join(". ")}
        />
        {action.kind === "pending-note" ? (
          <Text tone="muted">{action.text}</Text>
        ) : (
          <View style={{ flexDirection: "row" }}>
            <Button
              label={action.label}
              size="lg"
              disabled={action.disabled}
              onPress={() => props.onRequestLevel(game.gameId)}
            />
          </View>
        )}
      </View>
    );
  }

  if (stage === "partner") {
    return (
      <View style={{ gap: spacing.compact }}>
        <Hero
          kind="game"
          name={name}
          note={PARTNER_REQUIRED_INVITE_LANDING_COPY}
        />
        <View style={{ flexDirection: "row" }}>
          <Button
            label={PARTNER_REQUIRED_INVITE_LANDING_CTA}
            size="lg"
            onPress={() => props.onPickPartner(game.gameId)}
          />
        </View>
      </View>
    );
  }

  if (stage === "seat_pick") {
    return (
      <View style={{ gap: spacing.compact }}>
        <Hero
          kind="game"
          name={name}
          note={gameInviteSeatCopy(seatState, "link")}
        />
        <Surface padded={false} style={{ paddingHorizontal: spacing.surface }}>
          <SeatChoice
            sides={game.sides}
            canPick={!seatState.joinFrozen && !seatState.waitlistOnly}
            pending={props.acceptPending}
            onPick={(sideIndex, position) =>
              props.onAccept({ sideIndex, position })
            }
          />
        </Surface>
        {seatState.waitlistOnly ? (
          <View style={{ flexDirection: "row" }}>
            <Button
              label={INVITE_JOIN_WAITLIST_LABEL}
              size="lg"
              pending={props.acceptPending}
              onPress={() => props.onAccept()}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.compact }}>
      <Hero kind="game" name={name} note={rangeLabel} />
      <View style={{ flexDirection: "row" }}>
        <Button
          label={`Join ${name}`}
          size="lg"
          pending={props.acceptPending}
          onPress={() => props.onAccept()}
        />
      </View>
    </View>
  );
}

export function InviteLinkView(props: InviteLinkViewProps) {
  const { preview, kind } = props;

  if (preview.status === "loading") {
    return (
      <View style={{ gap: 12 }} accessibilityLabel="Loading invite">
        <Skeleton height={120} radius={16} />
        <Skeleton height={52} radius={12} />
      </View>
    );
  }
  if (preview.status === "error") {
    return (
      <Notice
        alert
        title="Couldn't load this invite"
        description="Check your connection and try again."
        onRetry={props.onRetry}
      />
    );
  }
  if (props.waitingForPartner) {
    return (
      <Outcome
        outcome="waiting_for_partner"
        kind="game"
        onGoHome={props.onGoHome}
      />
    );
  }
  const value = preview.value;
  if (value.status !== "ready") {
    return (
      <Outcome outcome={value.status} kind={kind} onGoHome={props.onGoHome} />
    );
  }
  if (value.kind === "game") {
    return <GameReady game={value.game} props={props} />;
  }
  return (
    <SimpleReady
      kind={value.kind}
      name={value.name}
      pending={props.acceptPending}
      onAccept={props.onAccept}
    />
  );
}
