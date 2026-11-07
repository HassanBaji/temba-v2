import { spacing } from "@repo/design-tokens";
import { footballInviteJoinSubtitle } from "@repo/domain/football-board";
import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  gameInviteGroupGate,
  gameInviteGroupCard,
  gameInviteGroupJoinedCopy,
  gameInviteGroupLandingCopy,
  gameInviteGroupRequestCard,
  gameInviteLinkStage,
  gameInviteSeatCopy,
  gameInviteSeatState,
  inviteKindLabel,
  inviteLinkJoinLabel,
  levelRangeGateAction,
  type GameInviteGroup,
  type GameInviteGroupChoice,
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

import { relativeDay } from "../booking/booking-model";
import { InfoRows, type InfoRow } from "../football/info-rows";
import { useNow } from "../games/use-now";
import { FootballJoinSheet } from "../football/join-sheet";
import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { GroupJoinSheet } from "./group-join-sheet";
import { SeatChoice } from "./seat-choice";

const HOLD_MARK = 44;

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
  /** The Group question on a Game link (design "Join via link"). */
  groupSheetOpen: boolean;
  groupChoicePending: GameInviteGroupChoice | null;
  /** The viewer chose the seat and the Group; the join stage shows as usual. */
  groupDecided: boolean;
  justJoinedGroup: boolean;
  withdrawPending: boolean;
  onOpenGroupSheet: () => void;
  onCloseGroupSheet: () => void;
  onChooseGroup: (choice: GameInviteGroupChoice) => void;
  onWithdraw: (requestId: string) => void;
  onOpenGroup: (groupId: string) => void;
};

function openSeatsOf(game: GameInviteLinkReady) {
  if (game.football) {
    return Math.max(
      0,
      (game.football.playersAllowed ?? 0) - game.football.players.length,
    );
  }
  return game.vacantSeats.length;
}

function groupRows(
  group: GameInviteGroup,
  rangeLabel: string | null,
  locale: ReturnType<typeof useLocale>,
  m: ReturnType<typeof useMessages>,
): InfoRow[] {
  const card = gameInviteGroupCard(group, locale);
  const rows: InfoRow[] = [
    { label: m.mobileInvite.link.group.groupRow, value: card.meta },
  ];
  if (rangeLabel) {
    rows.push({ label: m.common.level, value: rangeLabel });
  }
  return rows;
}

function BarLines({
  title,
  subline,
}: {
  title: string | null;
  subline: string | null;
}) {
  if (!title && !subline) {
    return null;
  }
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {title ? (
        <Text size="body" weight="semibold">
          {title}
        </Text>
      ) : null}
      {subline ? (
        <Text size="meta" tone="muted">
          {subline}
        </Text>
      ) : null}
    </View>
  );
}

/** Design 1a: the Game as the hook, the decision about the Group. */
function GroupLanding({
  game,
  group,
  name,
  rangeLabel,
  props,
}: {
  game: GameInviteLinkReady;
  group: GameInviteGroup;
  name: string;
  rangeLabel: string | null;
  props: InviteLinkViewProps;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = gameInviteGroupLandingCopy(group, openSeatsOf(game), locale);
  const groupOnlyPending = props.groupChoicePending === "group_only";
  return (
    <View style={{ gap: spacing.compact }}>
      <Hero kind="game" name={name} note={copy.heroNote} />
      <InfoRows rows={groupRows(group, rangeLabel, locale, m)} />
      <Surface style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text size="meta" tone="muted" style={{ flex: 1 }}>
          {copy.note}
        </Text>
        <Button
          label={copy.joinGroupLabel}
          variant="outline"
          size="sm"
          pending={groupOnlyPending}
          disabled={props.groupChoicePending != null}
          onPress={() => props.onChooseGroup("group_only")}
        />
      </Surface>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BarLines title={copy.barTitle} subline={copy.barSubline} />
        <Button
          label={copy.joinGameLabel}
          size="lg"
          disabled={props.groupChoicePending != null}
          onPress={props.onOpenGroupSheet}
        />
      </View>
      <GroupJoinSheet
        visible={props.groupSheetOpen}
        group={group}
        pending={props.groupChoicePending}
        onChoose={props.onChooseGroup}
        onClose={props.onCloseGroupSheet}
      />
    </View>
  );
}

/** Design 1f: the request is with the Organizers; the seat may be held. */
function GroupRequested({
  group,
  name,
  rangeLabel,
  props,
}: {
  group: GameInviteGroup;
  name: string;
  rangeLabel: string | null;
  props: InviteLinkViewProps;
}) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const request = group.pendingRequest;
  const heldUntil = request?.seatHeldUntil
    ? new Date(request.seatHeldUntil)
    : null;
  const heldLabel = heldUntil
    ? m.mobileInvite.subtitle.when(
        relativeDay(heldUntil, now, locale),
        formatGameClock(heldUntil, locale),
      )
    : null;
  const copy = gameInviteGroupRequestCard(group, heldLabel, locale);
  return (
    <View style={{ gap: spacing.compact }}>
      <Hero kind="game" name={name} />
      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: spacing.surface,
          }}
        >
          <View style={{ width: HOLD_MARK, height: HOLD_MARK }}>
            <Hatch radius={HOLD_MARK / 2} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text size="lead" weight="semibold">
              {copy.title}
            </Text>
            <Text size="meta" tone="muted">
              {copy.description}
            </Text>
          </View>
        </View>
        {copy.sharedByValue ? (
          <>
            <Hairline />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 16,
                paddingHorizontal: spacing.surface,
                paddingVertical: 14,
              }}
            >
              <Text tone="muted">{copy.sharedByLabel}</Text>
              <Text style={{ flexShrink: 1, textAlign: "right" }}>
                {copy.sharedByValue}
              </Text>
            </View>
          </>
        ) : null}
        {request ? (
          <>
            <Hairline />
            <View style={{ padding: spacing.compact, alignItems: "center" }}>
              <Button
                label={copy.withdrawLabel}
                variant="outline"
                pending={props.withdrawPending}
                onPress={() => props.onWithdraw(request.id)}
              />
            </View>
          </>
        ) : null}
      </Surface>
      <InfoRows rows={groupRows(group, rangeLabel, locale, m)} />
      <BarLines title={copy.barTitle} subline={copy.barSubline} />
    </View>
  );
}

/** Design 1d: in the Group now, the seat still open. */
function GroupJoinedNotice({
  game,
  group,
  onOpenGroup,
}: {
  game: GameInviteLinkReady;
  group: GameInviteGroup;
  onOpenGroup: (groupId: string) => void;
}) {
  const locale = useLocale();
  const copy = gameInviteGroupJoinedCopy(group, openSeatsOf(game), locale);
  return (
    <Surface style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {copy.title}
      </Text>
      <Text size="meta" tone="muted">
        {copy.description}
      </Text>
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        <Button
          label={copy.openGroupLabel}
          variant="outline"
          onPress={() => onOpenGroup(group.id)}
        />
      </View>
    </Surface>
  );
}

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
          label={m.mobileInvite.link.chooseHowYouPlay}
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
            ? m.mobileInvite.link.teamsSet
            : m.mobileInvite.link.teamsByOrganizer
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
  const name = gameDisplayName(game.game, locale);
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

  const group = game.group ?? null;
  const gate = gameInviteGroupGate(group);
  if (group && gate === "requested") {
    return (
      <GroupRequested
        group={group}
        name={name}
        rangeLabel={rangeLabel}
        props={props}
      />
    );
  }
  if (group && gate !== "none" && !props.groupDecided) {
    return (
      <GroupLanding
        game={game}
        group={group}
        name={name}
        rangeLabel={rangeLabel}
        props={props}
      />
    );
  }
  const joinedNotice =
    group && props.justJoinedGroup ? (
      <GroupJoinedNotice
        game={game}
        group={group}
        onOpenGroup={props.onOpenGroup}
      />
    ) : null;

  if (stage === "seat_pick") {
    return (
      <View style={{ gap: spacing.compact }}>
        {joinedNotice}
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
    return (
      <View style={{ gap: spacing.compact }}>
        {joinedNotice}
        <FootballReady name={name} football={game.football} props={props} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.compact }}>
      {joinedNotice}
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
        accessibilityLabel={m.mobileInvite.link.loadingA11y}
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
        title={m.mobileInvite.link.loadErrorTitle}
        description={m.mobileInvite.link.loadErrorDescription}
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
