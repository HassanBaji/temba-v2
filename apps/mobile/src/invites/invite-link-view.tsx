import { spacing } from "@repo/design-tokens";
import { footballInviteJoinSubtitle } from "@repo/domain/football-board";
import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  gameInviteLinkStage,
  gameInviteSeatCopy,
  gameInviteSeatState,
  inviteKindLabel,
  inviteLinkJoinLabel,
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
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useState } from "react";
import { View } from "react-native";

import { FootballJoinSheet } from "../football/join-sheet";
import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
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
  acceptError: string | null;
  requestPending: boolean;
  waitingForPartner: boolean;
  onAccept: (seat?: { sideIndex: number; position: "left" | "right" }) => void;
  onAcceptFootball: (role: FootballRole, position: FootballPosition) => void;
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
  const locale = useLocale();
  const copy = inviteOutcomeCopy(outcome, inviteKindLabel(kind), locale);
  const action = inviteOutcomeAction(true, locale);
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
  const m = useMessages();
  return (
    <Surface tone="ink" style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={name} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="h2" weight="bold" accessibilityRole="header">
            {m.invite.link.joinLabel(name)}
          </Text>
          <Text size="eyebrow" tone="muted" mono uppercase>
            {m.invite.kind[kind]}
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
  requiresApproval,
  pending,
  onAccept,
}: {
  kind: InviteKind;
  name: string;
  requiresApproval?: boolean;
  pending: boolean;
  onAccept: InviteLinkViewProps["onAccept"];
}) {
  const locale = useLocale();
  return (
    <View style={{ gap: spacing.compact }}>
      <Hero kind={kind} name={name} />
      <View style={{ flexDirection: "row" }}>
        <Button
          label={inviteLinkJoinLabel(name, locale, requiresApproval)}
          size="lg"
          pending={pending}
          onPress={() => onAccept()}
        />
      </View>
    </View>
  );
}

function FootballReady({
  name,
  football,
  props,
}: {
  name: string;
  football: NonNullable<GameInviteLinkReady["football"]>;
  props: InviteLinkViewProps;
}) {
  const [open, setOpen] = useState(true);
  const m = useMessages();
  const locale = useLocale();
  const subtitle = footballInviteJoinSubtitle(football, locale);
  return (
    <View style={{ gap: spacing.compact }}>
      <Hero kind="game" name={name} note={subtitle} />
      <View style={{ flexDirection: "row" }}>
        <Button
          label={m.mobileCommunity.inviteLink.chooseHowYouPlay}
          size="lg"
          onPress={() => setOpen(true)}
        />
      </View>
      <FootballJoinSheet
        visible={open}
        mode="join"
        subtitle={subtitle}
        players={football.players}
        viewer={football.preferred}
        price={formatPricePerPlayerFils(football.pricePerPlayerFils, locale)}
        teamsLine={
          football.teamsSet
            ? m.mobileCommunity.inviteLink.teamsSet
            : m.mobileCommunity.inviteLink.teamsByOrganizer
        }
        pending={props.acceptPending}
        error={props.acceptError}
        onClose={() => setOpen(false)}
        onSubmit={props.onAcceptFootball}
      />
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
  const m = useMessages();
  const locale = useLocale();
  const name = game.gameName ?? m.invite.kind.game;
  const rangeLabel = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
    locale,
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
      locale,
    });
    return (
      <View style={{ gap: spacing.compact }}>
        <Hero
          kind="game"
          name={name}
          note={[
            rangeLabel,
            formatLevelRangeGateCopy({
              levelMinTenths: game.levelMinTenths,
              levelMaxTenths: game.levelMaxTenths,
              viewerLevelTenths: game.viewerLevelTenths,
              locale,
            }),
          ]
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
          note={m.tournament.join.partnerInviteLanding}
        />
        <View style={{ flexDirection: "row" }}>
          <Button
            label={m.tournament.join.pickAPartner}
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
          note={gameInviteSeatCopy(seatState, "link", locale)}
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
              label={m.invite.inbox.joinWaitlistLabel}
              size="lg"
              pending={props.acceptPending}
              onPress={() => props.onAccept()}
            />
          </View>
        ) : null}
      </View>
    );
  }

  if (stage === "football" && game.football) {
    return <FootballReady name={name} football={game.football} props={props} />;
  }

  return (
    <View style={{ gap: spacing.compact }}>
      <Hero kind="game" name={name} note={rangeLabel} />
      <View style={{ flexDirection: "row" }}>
        <Button
          label={m.invite.link.joinLabel(name)}
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
  const m = useMessages();

  if (preview.status === "loading") {
    return (
      <View
        style={{ gap: 12 }}
        accessibilityLabel={m.mobileCommunity.inviteLink.loadingA11y}
      >
        <Skeleton height={120} radius={16} />
        <Skeleton height={52} radius={12} />
      </View>
    );
  }
  if (preview.status === "error") {
    return (
      <Notice
        alert
        title={m.mobileCommunity.inviteLink.loadErrorTitle}
        description={m.mobileCommunity.inviteLink.loadErrorDescription}
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
      requiresApproval={value.requiresApproval}
      pending={props.acceptPending}
      onAccept={props.onAccept}
    />
  );
}
