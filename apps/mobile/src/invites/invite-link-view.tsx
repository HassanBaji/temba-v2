import { radii, sizes, spacing } from "@repo/design-tokens";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import {
  gameInviteHeroModel,
  gameInviteInfoRows,
  gameInviteLevelFit,
  gameInviteLevelRow,
  gameInviteSharerName,
  type GameInviteHero,
} from "@repo/domain/game-invite-hero";
import { formatGameClock } from "@repo/domain/format-game-start";
import { groupDisplayName } from "@repo/domain/group-join";
import {
  gameInviteSeatCourt,
  type InviteSeatPick,
} from "@repo/domain/game-invite-join-sheet";
import {
  gameInviteGroupGate,
  gameInviteGroupJoinedCopy,
  gameInviteGroupLandingCopy,
  gameInviteGroupRequestCard,
  gameInviteLinkStage,
  gameInviteSeatState,
  inviteKindLabel,
  inviteLinkJoinLabel,
  levelRangeGateAction,
  type GameInviteGroup,
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
import { Check, Users } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { relativeDay } from "../booking/booking-model";
import { InfoRows } from "../football/info-rows";
import { useNow } from "../games/use-now";
import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { InviteGameHero, type InviteHeroNote } from "./invite-game-hero";
import { InviteJoinSheet, type InviteJoinChoice } from "./invite-join-sheet";
import { InviteSeatCourt, InviteSitHereTile } from "./invite-seat-court";

const HOLD_MARK = 36;
const CHECK_MARK = 36;

export type InviteLinkViewProps = {
  kind: InviteKind;
  preview: Slot<InviteLinkPreview>;
  refreshing: boolean;
  onRefresh: () => void;
  acceptPending: boolean;
  acceptError: string | null;
  waitingForPartner: boolean;
  /** Group and Team links, and a Game with nothing to pick: the one-tap join. */
  onAccept: () => void;
  onPickPartner: (gameId: string) => void;
  onGoHome: () => void;
  onRetry: () => void;
  /** The one join sheet of a Game link (design 3d, 3f). */
  sheetOpen: boolean;
  sheetPicked: InviteSeatPick | null;
  onOpenSheet: (picked: InviteSeatPick | null) => void;
  onCloseSheet: () => void;
  onSubmitJoin: (choice: InviteJoinChoice) => void;
  /** "Join group" on its own, from the landing note. */
  groupOnlyPending: boolean;
  onJoinGroupOnly: () => void;
  justJoinedGroup: boolean;
  withdrawPending: boolean;
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

function InviteLinkHeader() {
  const m = useMessages();
  return (
    <ScreenHeader
      nav="back"
      fallback="/profile"
      title={m.mobileInvite.link.title}
    />
  );
}

/** Loading, errors and Group or Team links: the titled screen without a hero. */
function PlainScreen({
  props,
  children,
}: {
  props: InviteLinkViewProps;
  children: React.ReactNode;
}) {
  return (
    <Screen refreshing={props.refreshing} onRefresh={props.onRefresh}>
      <InviteLinkHeader />
      {children}
    </Screen>
  );
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

/** The fixed bar under a Game link: what is open, and the one action. */
function Bar({
  title,
  subline,
  action,
}: {
  title: string | null;
  subline: string | null;
  action?: React.ReactNode;
}) {
  const lines = Boolean(title) || Boolean(subline);
  return (
    <>
      <BarLines title={title} subline={subline} />
      {action ? (
        <View style={lines ? undefined : { flex: 1 }}>{action}</View>
      ) : null}
    </>
  );
}

/** Design 1a: "Games live inside groups" with the inline Join group. */
function GroupOnlyNote({
  note,
  label,
  pending,
  disabled,
  onPress,
}: {
  note: string;
  label: string;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Surface
      radius="card"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
    >
      <Users size={sizes.iconRow} color={colors.muted} />
      <Text size="meta" tone="muted" style={{ flex: 1, minWidth: 0 }}>
        {note}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: pending }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={12}
        style={({ pressed }) => ({
          minHeight: sizes.touchTarget,
          justifyContent: "center",
          opacity: pressed || disabled ? 0.6 : 1,
        })}
      >
        <Text size="meta" weight="semibold">
          {label}
        </Text>
      </Pressable>
    </Surface>
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
  const colors = useColors();
  const copy = gameInviteGroupJoinedCopy(group, openSeatsOf(game), locale);
  return (
    <Surface
      radius="card"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderColor: colors.ink,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: CHECK_MARK,
          height: CHECK_MARK,
          borderRadius: radii.sm,
          backgroundColor: colors.control,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check size={sizes.iconRow} color={colors.onControl} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="body" weight="semibold">
          {copy.title}
        </Text>
        <Text size="meta" tone="muted">
          {copy.description}
        </Text>
      </View>
      <Button
        label={copy.openGroupLabel}
        variant="outline"
        size="sm"
        onPress={() => onOpenGroup(group.id)}
      />
    </Surface>
  );
}

/** Design 1f: the request is with the Organizers; the seat may be held. */
function RequestCard({
  group,
  pending,
  onWithdraw,
}: {
  group: GameInviteGroup;
  pending: boolean;
  onWithdraw: (requestId: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
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
    <Surface
      padded={false}
      radius="card"
      style={{ overflow: "hidden", borderColor: colors.ink }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          padding: spacing.surface,
        }}
      >
        <View style={{ width: HOLD_MARK, height: HOLD_MARK }}>
          <Hatch radius={HOLD_MARK / 2} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text size="body" weight="semibold">
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
            <Text size="meta" tone="muted">
              {copy.sharedByLabel}
            </Text>
            <Text size="meta" style={{ flexShrink: 1, textAlign: "right" }}>
              {copy.sharedByValue}
            </Text>
          </View>
        </>
      ) : null}
      {request ? (
        <>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pending, busy: pending }}
            disabled={pending}
            onPress={() => onWithdraw(request.id)}
            style={({ pressed }) => ({
              minHeight: sizes.touchTarget,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              opacity: pressed || pending ? 0.6 : 1,
            })}
          >
            <Text size="meta" tone="muted">
              {copy.withdrawLabel}
            </Text>
          </Pressable>
        </>
      ) : null}
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

/** The head of a Group or Team link, and of a Game link the API sent no hero for. */
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

/** What the screen shows: the head's seats, the body, the bar, and the sheet. */
type GameLayout = {
  note: InviteHeroNote | null;
  seats: React.ReactNode;
  countHint: string | null;
  afterTiles: React.ReactNode;
  body: React.ReactNode;
  bar: React.ReactNode;
};

function useGameLayout(
  game: GameInviteLinkReady,
  hero: GameInviteHero,
  props: InviteLinkViewProps,
): GameLayout {
  const m = useMessages();
  const locale = useLocale();
  const name = gameDisplayName(game.game, locale);
  const stage = gameInviteLinkStage(game, true);
  const seatState = gameInviteSeatState({
    registrationStatus: game.registrationStatus,
    vacantSeatCount: game.vacantSeats.length,
  });
  const fit = gameInviteLevelFit({
    isSignedIn: true,
    viewerLevelTenths: game.viewerLevelTenths,
    viewerPassesLevelRange: game.viewerPassesLevelRange,
  });
  const rows = gameInviteInfoRows({
    hero,
    levelRow: gameInviteLevelRow({
      levelMinTenths: game.levelMinTenths,
      levelMaxTenths: game.levelMaxTenths,
      fit,
      locale,
    }),
    locale,
  });
  const info = rows.length > 0 ? <InfoRows rows={rows} /> : null;
  const group = game.group ?? null;
  const gate = gameInviteGroupGate(group);
  const groupName = group ? groupDisplayName(group.name, locale) : null;
  const groupNote = (text: string): InviteHeroNote => ({
    text,
    groupName,
    groupImageUrl: group?.imageUrl ?? null,
  });
  const sharer = gameInviteSharerName(hero);
  const openSeats = openSeatsOf(game);
  const heroCopy = m.mobileInvite.link.hero;
  const groupCopy = m.mobileInvite.link.group;
  const seatsTitle = openSeats > 0 ? groupCopy.seatsOpen(openSeats) : null;
  const memberNote =
    group && props.justJoinedGroup && groupName
      ? groupNote(heroCopy.joinedNote(groupName))
      : group && gate === "none" && groupName
        ? groupNote(heroCopy.memberNote(groupName))
        : sharer
          ? groupNote(groupCopy.sharedBy(sharer))
          : null;
  const levelBlocked = stage === "level_range";
  const levelPending =
    levelBlocked && game.levelRangeRequest?.status === "pending";
  const requestedGate = gate === "requested";
  const football = game.football;
  const seatGame = game.sides.length > 0;
  const canSit =
    stage !== "partner" &&
    !seatState.joinFrozen &&
    !requestedGate &&
    !levelPending;
  const court = seatGame ? gameInviteSeatCourt(game.sides, locale) : null;
  const seats = court ? (
    <InviteSeatCourt
      court={court}
      onSit={
        canSit && !seatState.waitlistOnly
          ? (seat) =>
              props.onOpenSheet({
                sideIndex: seat.sideIndex,
                position: seat.position,
              })
          : null
      }
    />
  ) : null;
  const afterTiles =
    football && openSeats > 0 ? (
      <InviteSitHereTile
        sub={heroCopy.sitHereFootball(groupCopy.seatsOpen(openSeats))}
        onSit={canSit ? () => props.onOpenSheet(null) : null}
      />
    ) : null;
  const sheet =
    seatGame || football || gate !== "none" ? (
      <InviteJoinSheet
        visible={props.sheetOpen}
        onClose={props.onCloseSheet}
        input={{
          kind: football ? "football" : "padel",
          sides: game.sides,
          picked: props.sheetPicked,
          usualSide: null,
          teamsMadeAt: null,
          group,
          gate,
          gamePublic: game.isPublic ?? false,
          levelBlocked,
          locale,
        }}
        football={
          football
            ? { players: football.players, preferred: football.preferred }
            : null
        }
        pending={props.acceptPending}
        error={props.acceptError}
        onSubmit={props.onSubmitJoin}
      />
    ) : null;
  const head = {
    seats,
    countHint: court && canSit ? heroCopy.tapASeat : null,
    afterTiles,
  };

  if (group && requestedGate) {
    const copy = gameInviteGroupRequestCard(group, null, locale);
    return {
      ...head,
      note: null,
      body: (
        <>
          <RequestCard
            group={group}
            pending={props.withdrawPending}
            onWithdraw={props.onWithdraw}
          />
          {info}
        </>
      ),
      bar: <Bar title={copy.barTitle} subline={copy.barSubline} />,
    };
  }

  if (stage === "partner") {
    return {
      ...head,
      note: memberNote,
      body: (
        <>
          <Surface>
            <Text tone="muted">{m.tournament.join.partnerInviteLanding}</Text>
          </Surface>
          {info}
        </>
      ),
      bar: (
        <Bar
          title={seatsTitle}
          subline={null}
          action={
            <Button
              label={m.tournament.join.pickAPartner}
              size="lg"
              onPress={() => props.onPickPartner(game.gameId)}
            />
          }
        />
      ),
    };
  }

  const joinedNotice =
    group && props.justJoinedGroup ? (
      <GroupJoinedNotice
        game={game}
        group={group}
        onOpenGroup={props.onOpenGroup}
      />
    ) : null;
  const landingNote =
    group && gate !== "none" && !props.justJoinedGroup
      ? gameInviteGroupLandingCopy(group, openSeats, locale)
      : null;
  const body = (
    <>
      {joinedNotice}
      {levelBlocked ? (
        <Surface>
          <Text tone="muted">
            {formatLevelRangeGateCopy({
              levelMinTenths: game.levelMinTenths,
              levelMaxTenths: game.levelMaxTenths,
              viewerLevelTenths: game.viewerLevelTenths,
              locale,
            })}
          </Text>
        </Surface>
      ) : null}
      {info}
      {landingNote ? (
        <GroupOnlyNote
          note={landingNote.note}
          label={landingNote.joinGroupLabel}
          pending={props.groupOnlyPending}
          disabled={props.acceptPending}
          onPress={props.onJoinGroupOnly}
        />
      ) : null}
      {sheet}
    </>
  );
  const note = landingNote ? groupNote(landingNote.heroNote) : memberNote;

  if (levelPending) {
    const action = levelRangeGateAction({
      requestStatus: "pending",
      canRequest: false,
      requesting: false,
      locale,
    });
    return {
      ...head,
      note,
      body,
      bar: (
        <Bar
          title={null}
          subline={action.kind === "pending-note" ? action.text : null}
        />
      ),
    };
  }

  if (seatState.joinFrozen) {
    return {
      ...head,
      note,
      body,
      bar: <Bar title={null} subline={m.invite.inbox.seatCopy.frozen} />,
    };
  }

  if (seatGame && seatState.waitlistOnly && !levelBlocked && gate === "none") {
    return {
      ...head,
      note,
      body,
      bar: (
        <Bar
          title={null}
          subline={null}
          action={
            <Button
              label={m.invite.inbox.joinWaitlistLabel}
              size="lg"
              pending={props.acceptPending}
              onPress={() => props.onAccept()}
            />
          }
        />
      ),
    };
  }

  const opensSheet = sheet != null;
  const subline =
    group && props.justJoinedGroup
      ? groupCopy.oneTap
      : football
        ? heroCopy.barSheetFootball
        : seatGame
          ? heroCopy.barSheetPadel
          : gate !== "none"
            ? groupCopy.asksFirst
            : null;
  return {
    ...head,
    note,
    body,
    bar: (
      <Bar
        title={seatsTitle}
        subline={subline}
        action={
          <Button
            label={
              opensSheet ? groupCopy.joinGame : m.invite.link.joinLabel(name)
            }
            size="lg"
            pending={!opensSheet && props.acceptPending}
            disabled={props.acceptPending}
            onPress={() =>
              opensSheet ? props.onOpenSheet(null) : props.onAccept()
            }
          />
        }
      />
    ),
  };
}

function GameReady({
  game,
  hero,
  props,
}: {
  game: GameInviteLinkReady;
  hero: GameInviteHero;
  props: InviteLinkViewProps;
}) {
  const locale = useLocale();
  const now = useNow();
  const layout = useGameLayout(game, hero, props);
  return (
    <Screen
      refreshing={props.refreshing}
      onRefresh={props.onRefresh}
      statusBarTone="ink"
      header={
        <InviteGameHero
          model={gameInviteHeroModel(hero, now, locale)}
          note={layout.note}
          seats={layout.seats ?? undefined}
          countHint={layout.countHint}
          afterTiles={layout.afterTiles}
        />
      }
      footer={layout.bar}
    >
      {layout.body}
    </Screen>
  );
}

/** A Game link from an API without the hero: the earlier titled layout. */
function GameReadyWithoutHero({
  game,
  props,
}: {
  game: GameInviteLinkReady;
  props: InviteLinkViewProps;
}) {
  const locale = useLocale();
  const name = gameDisplayName(game.game, locale);
  const rangeLabel = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
    locale,
  );
  return (
    <PlainScreen props={props}>
      <View style={{ gap: spacing.compact }}>
        <Hero kind="game" name={name} note={rangeLabel} />
        <View style={{ flexDirection: "row" }}>
          <Button
            label={inviteLinkJoinLabel(name, locale)}
            size="lg"
            pending={props.acceptPending}
            onPress={() => props.onAccept()}
          />
        </View>
      </View>
    </PlainScreen>
  );
}

export function InviteLinkView(props: InviteLinkViewProps) {
  const { preview, kind } = props;
  const m = useMessages();

  if (preview.status === "loading") {
    return (
      <PlainScreen props={props}>
        <View
          style={{ gap: 12 }}
          accessibilityLabel={m.mobileInvite.link.loadingA11y}
        >
          <Skeleton height={320} radius={16} />
          <Skeleton height={52} radius={12} />
        </View>
      </PlainScreen>
    );
  }
  if (preview.status === "error") {
    return (
      <PlainScreen props={props}>
        <Notice
          alert
          title={m.mobileInvite.link.loadErrorTitle}
          description={m.mobileInvite.link.loadErrorDescription}
          onRetry={props.onRetry}
        />
      </PlainScreen>
    );
  }
  if (props.waitingForPartner) {
    return (
      <PlainScreen props={props}>
        <Outcome
          outcome="waiting_for_partner"
          kind="game"
          onGoHome={props.onGoHome}
        />
      </PlainScreen>
    );
  }
  const value = preview.value;
  if (value.status !== "ready") {
    return (
      <PlainScreen props={props}>
        <Outcome outcome={value.status} kind={kind} onGoHome={props.onGoHome} />
      </PlainScreen>
    );
  }
  if (value.kind === "game") {
    const hero = value.game.hero;
    return hero ? (
      <GameReady game={value.game} hero={hero} props={props} />
    ) : (
      <GameReadyWithoutHero game={value.game} props={props} />
    );
  }
  return (
    <PlainScreen props={props}>
      <SimpleReady
        kind={value.kind}
        name={value.name}
        requiresApproval={value.requiresApproval}
        pending={props.acceptPending}
        onAccept={props.onAccept}
      />
    </PlainScreen>
  );
}
