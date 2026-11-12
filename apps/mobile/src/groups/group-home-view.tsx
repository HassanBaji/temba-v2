import { spacing } from "@repo/design-tokens";
import type { GroupHomeData } from "@repo/domain/group-data";
import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import {
  groupHomeCanManageInvites,
  groupHomeCanShowCreateGame,
} from "@repo/domain/group-home-cta";
import {
  groupShowsLevel,
  viewerMayAdjustTier,
  viewerMaySetGroupLevel,
  type GroupMemberOrganizerAction,
} from "@repo/domain/group-home-chrome";
import {
  groupLeaveVenueActionLabel,
  groupLinkRequestBannerText,
  groupPartOfVenueLine,
} from "@repo/domain/group-link-request";
import { groupMemberRowsLink } from "@repo/domain/player-profile";
import { groupDisplayName, type GroupJoinDoor } from "@repo/domain/group-join";
import type { GroupMenuItem } from "@repo/domain/group-settings";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { EllipsisVertical, UserRoundPlus } from "lucide-react-native";
import { useRef } from "react";
import { View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import type { GameCardActions } from "../games/game-card";
import { SeatPickerSheet } from "../games/seat-picker-sheet";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { GamesTab, type GamesTabProps } from "./games-tab";
import { JoinRequestsBanner, JoinRequestsCard } from "./group-approver-view";
import { GroupMenuSheet } from "./group-menu-sheet";
import { RejectRequestSheet, WhoCanJoinSheet } from "./join-request-sheets";
import type { GroupApproverHandlers } from "./use-group-admin";
import { groupHomeHeader, groupJoinCta } from "./group-home-model";
import { MembersTab } from "./members-tab";
import { SavedLevelBanner } from "./saved-level-banner";
import type { SavedLevel } from "./set-level-model";
import { StandingTab } from "./standing-tab";
import type { GroupLinkRequestRow } from "./use-group-link-request";

export type GroupAdminHandlers = {
  approver: GroupApproverHandlers;
};

export type GroupMenuProps = {
  visible: boolean;
  items: GroupMenuItem[];
  roleLine: string | null;
  /** Why Leave is disabled, or `null` when the viewer may leave. */
  leaveBlockedHint: string | null;
  /** The current Rating settings, under their row (screen 3a). */
  ratingSettingsHint: string | null;
  copyPending: boolean;
  onOpen: () => void;
  onPick: (item: GroupMenuItem) => void;
  onClose: () => void;
};

export type GroupHomeViewProps = {
  data: GroupHomeData;
  apiOrigin: string;
  tab: GroupHomeTab;
  onTabChange: (tab: GroupHomeTab) => void;
  joinPending: boolean;
  onJoin: (door: GroupJoinDoor) => void;
  onLeaveVenue: () => void;
  onInvite: () => void;
  menu: GroupMenuProps;
  onAddPlayer: () => void;
  onRenameUnclaimed: (member: { userId: string; name: string }) => void;
  onRemovePlayer: (member: { userId: string; name: string }) => void;
  onOrganizerAction: (
    member: { userId: string; name: string },
    action: GroupMemberOrganizerAction,
  ) => void;
  confirm: ConfirmRequest | null;
  confirmPending: boolean;
  onCloseConfirm: () => void;
  memberQuery: string;
  onMemberQueryChange: (query: string) => void;
  /** Names on the Group's pending lookup invites, for an inviter. */
  pendingInviteNames?: string[];
  onOpenMember: (userId: string) => void;
  onSetLevel: (userId: string) => void;
  onSetGroupLevel: (userId: string) => void;
  onOpenTierHistory?: (userId: string) => void;
  saved: SavedLevel | null;
  onDismissSaved: () => void;
  games: Omit<
    GamesTabProps,
    | "upcomingGames"
    | "actions"
    | "sport"
    | "members"
    | "isMember"
    | "apiOrigin"
    | "onInvite"
    | "createGameHref"
  >;
  pickerGame: HubGameRow | null;
  onClosePicker: () => void;
  onPickSeat: (
    gameId: string,
    sideIndex: number,
    position: "left" | "right",
  ) => void;
  actions: GameCardActions;
  admin: GroupAdminHandlers;
  venueRequests: GroupLinkRequestRow[];
  venueRequestPendingId: string | null;
  onAcceptVenueRequest: (request: GroupLinkRequestRow) => void;
  onDeclineVenueRequest: (request: GroupLinkRequestRow) => void;
  /** Scrolls the screen so `target` is in view. */
  onScrollTo: (target: View | null) => void;
};

const TABS: GroupHomeTab[] = ["standing", "games", "members"];

export function GroupHomeView(props: GroupHomeViewProps) {
  const { data } = props;
  const locale = useLocale();
  const m = useMessages();
  const header = groupHomeHeader(data, props.apiOrigin, locale);
  const cta = groupJoinCta(data, props.joinPending, locale);
  const door = cta?.door;
  const onInvite = groupHomeCanManageInvites(data) ? props.onInvite : undefined;
  const createGameHref = groupHomeCanShowCreateGame(data)
    ? ({ pathname: "/games/new", params: { groupId: data.id } } as const)
    : undefined;
  const requestsRef = useRef<View>(null);
  const { approver } = props.admin;
  const requestCount =
    approver.requests.status === "ready" ? approver.requests.value.length : 0;

  return (
    <View style={{ gap: spacing.compact }}>
      <ScreenHeader
        nav="back"
        fallback="/groups"
        actions={
          <>
            {groupHomeCanManageInvites(data) ? (
              <HeaderIconButton
                framed
                icon={UserRoundPlus}
                accessibilityLabel={m.group.settings.menu.invite}
                onPress={props.onInvite}
              />
            ) : null}
            {props.menu.items.length > 0 ? (
              <HeaderIconButton
                framed
                icon={EllipsisVertical}
                accessibilityLabel={m.common.more}
                onPress={props.menu.onOpen}
              />
            ) : null}
          </>
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar name={header.name} uri={header.imageUri} size="xl" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="h2" weight="bold" accessibilityRole="header">
              {header.name}
            </Text>
            {header.meta ? (
              <Text size="meta" tone="muted">
                {header.meta}
              </Text>
            ) : null}
          </View>
        </View>
      </ScreenHeader>

      {data.venue ? (
        <Text size="meta" tone="muted">
          {groupPartOfVenueLine(data.venue.name, locale)}
        </Text>
      ) : null}

      {data.canUnlinkFromVenue && data.venue ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={groupLeaveVenueActionLabel(data.venue.name, locale)}
            size="sm"
            variant="outline"
            onPress={props.onLeaveVenue}
          />
        </View>
      ) : null}

      {props.venueRequests.map((request) => (
        <Surface key={request.id} style={{ gap: 10 }}>
          <Text size="meta">
            {groupLinkRequestBannerText(request.venueName, locale)}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label={m.group.linkRequest.declineLabel}
              accessibilityLabel={m.mobileGroup.home.declineVenueRequest(
                request.venueName,
              )}
              size="sm"
              variant="outline"
              disabled={props.venueRequestPendingId === request.id}
              onPress={() => props.onDeclineVenueRequest(request)}
            />
            <Button
              label={m.group.linkRequest.acceptLabel}
              accessibilityLabel={m.mobileGroup.home.reviewVenueRequest(
                request.venueName,
              )}
              size="sm"
              pending={props.venueRequestPendingId === request.id}
              onPress={() => props.onAcceptVenueRequest(request)}
            />
          </View>
        </Surface>
      ))}

      {cta ? (
        <Button
          label={cta.label}
          size="lg"
          pending={props.joinPending}
          disabled={cta.disabled}
          onPress={door ? () => props.onJoin(door) : undefined}
        />
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        {TABS.map((key) => (
          <Button
            key={key}
            label={m.mobileGroup.home.tabs[key]}
            size="sm"
            variant={key === props.tab ? "default" : "outline"}
            selected={key === props.tab}
            onPress={() => props.onTabChange(key)}
          />
        ))}
      </View>

      {props.tab === "standing" ? (
        <StandingTab
          data={data}
          apiOrigin={props.apiOrigin}
          onInvite={onInvite}
          createGameHref={createGameHref}
          onOpenMember={
            groupMemberRowsLink(data.membership)
              ? props.onOpenMember
              : undefined
          }
          onOpenMembers={() => props.onTabChange("members")}
        />
      ) : null}
      {props.tab === "games" ? (
        <GamesTab
          {...props.games}
          upcomingGames={data.upcomingGames}
          actions={props.actions}
          sport={data.sport ?? null}
          members={data.standing.leaderboard}
          isMember={data.membership != null}
          apiOrigin={props.apiOrigin}
          onInvite={onInvite}
          createGameHref={createGameHref}
        />
      ) : null}
      {props.tab === "members" && props.saved && data.viewerCanSetLevel ? (
        <SavedLevelBanner
          saved={props.saved}
          onDismiss={props.onDismissSaved}
        />
      ) : null}
      {props.tab === "members" ? (
        <MembersTab
          groupId={data.id}
          leaderboard={data.standing.leaderboard}
          query={props.memberQuery}
          onQueryChange={props.onMemberQueryChange}
          onOpenMember={
            groupMemberRowsLink(data.membership)
              ? props.onOpenMember
              : undefined
          }
          apiOrigin={props.apiOrigin}
          canSetLevel={data.viewerCanSetLevel && groupShowsLevel(data.sport)}
          showLevel={groupShowsLevel(data.sport)}
          tierSummary={data.hasTier ? (data.tierSummary ?? null) : null}
          groupName={groupDisplayName(data.name, locale)}
          canAdjustTier={viewerMayAdjustTier({
            hasTier: data.hasTier,
            leaderboard: data.standing.leaderboard,
          })}
          onOpenTierHistory={props.onOpenTierHistory}
          onSetLevel={props.onSetLevel}
          onSetGroupLevel={
            viewerMaySetGroupLevel({
              sport: data.sport,
              canCreateGame: data.canCreateGame,
              leaderboard: data.standing.leaderboard,
            })
              ? props.onSetGroupLevel
              : undefined
          }
          canAddPlayers={data.canAddPlayers}
          onRenameUnclaimed={props.onRenameUnclaimed}
          canRemovePlayers={data.canRemovePlayers}
          onRemovePlayer={props.onRemovePlayer}
          canAppointOrganizers={data.canAppointOrganizers}
          onOrganizerAction={props.onOrganizerAction}
          pendingInviteNames={props.pendingInviteNames}
          onOpenInvites={onInvite}
          onAddPlayer={props.onAddPlayer}
          top={
            data.canDecideJoinRequests ? (
              <JoinRequestsBanner
                count={requestCount}
                onReview={() => props.onScrollTo(requestsRef.current)}
              />
            ) : null
          }
          afterTable={
            data.canDecideJoinRequests ? (
              <JoinRequestsCard
                ref={requestsRef}
                requests={approver.requests}
                requiresApproval={data.requiresApproval}
                approvedToday={data.joinRequestsApprovedToday}
                apiOrigin={props.apiOrigin}
                showLevel={groupShowsLevel(data.sport)}
                approvePendingId={approver.approvePendingId}
                rejectPendingId={approver.rejectPendingId}
                onApprove={approver.onApprove}
                onAskReject={approver.onAskReject}
                onOpenProfile={props.onOpenMember}
                onChangePolicy={approver.onChangePolicy}
                onRetry={approver.onRetry}
              />
            ) : null
          }
        />
      ) : null}
      {data.canDecideJoinRequests ? (
        <>
          <RejectRequestSheet
            {...approver.rejectSheet}
            apiOrigin={props.apiOrigin}
          />
          <WhoCanJoinSheet
            {...approver.whoCanJoinSheet}
            requiresApproval={data.requiresApproval}
          />
        </>
      ) : null}

      <SeatPickerSheet
        game={props.pickerGame}
        pending={props.games.pendingGameId != null}
        onClose={props.onClosePicker}
        onPick={(gameId, sideIndex, position) => {
          props.onClosePicker();
          props.onPickSeat(gameId, sideIndex, position);
        }}
      />
      <ConfirmSheet
        request={props.confirm}
        pending={props.confirmPending}
        onClose={props.onCloseConfirm}
      />
      <GroupMenuSheet
        visible={props.menu.visible}
        name={header.name}
        roleLine={props.menu.roleLine}
        items={props.menu.items}
        leaveBlockedHint={props.menu.leaveBlockedHint}
        ratingSettingsHint={props.menu.ratingSettingsHint}
        copyPending={props.menu.copyPending}
        onPick={props.menu.onPick}
        onClose={props.menu.onClose}
      />
    </View>
  );
}
