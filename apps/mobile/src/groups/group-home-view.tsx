import { spacing } from "@repo/design-tokens";
import type { GroupHomeData } from "@repo/domain/group-data";
import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import { groupHomeCanManageInvites } from "@repo/domain/group-home-cta";
import { groupManageActions } from "@repo/domain/group-admin";
import type { GroupJoinDoor } from "@repo/domain/group-join";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import type { GameCardActions } from "../games/game-card";
import { SeatPickerSheet } from "../games/seat-picker-sheet";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { GamesTab, type GamesTabProps } from "./games-tab";
import {
  GroupApproverView,
  type GroupApproverProps,
} from "./group-approver-view";
import { groupBanner, groupHomeHeader, groupJoinCta } from "./group-home-model";
import { MembersTab } from "./members-tab";
import { SavedLevelBanner } from "./saved-level-banner";
import type { SavedLevel } from "./set-level-model";
import { StandingTab } from "./standing-tab";

export type GroupAdminHandlers = {
  approver: Pick<
    GroupApproverProps,
    | "requests"
    | "requiresApprovalPending"
    | "onRequiresApprovalChange"
    | "approvePendingId"
    | "rejectPendingId"
    | "onApprove"
    | "onReject"
    | "onRetry"
  >;
  imagePending: boolean;
  onChangeImage: () => void;
  onRemoveImage: () => void;
  onDelete: () => void;
};

export type GroupHomeViewProps = {
  data: GroupHomeData;
  apiOrigin: string;
  tab: GroupHomeTab;
  onTabChange: (tab: GroupHomeTab) => void;
  joinPending: boolean;
  onJoin: (door: GroupJoinDoor) => void;
  onLeave: () => void;
  onInvite: () => void;
  confirm: ConfirmRequest | null;
  confirmPending: boolean;
  onCloseConfirm: () => void;
  memberQuery: string;
  onMemberQueryChange: (query: string) => void;
  onSetLevel: (userId: string) => void;
  saved: SavedLevel | null;
  onDismissSaved: () => void;
  games: Omit<
    GamesTabProps,
    "upcomingGames" | "isCommunityArchived" | "actions"
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
};

const TABS: { key: GroupHomeTab; label: string }[] = [
  { key: "standing", label: "Standing" },
  { key: "games", label: "Games" },
  { key: "members", label: "Members" },
];

export function GroupHomeView(props: GroupHomeViewProps) {
  const { data } = props;
  const header = groupHomeHeader(data, props.apiOrigin);
  const cta = groupJoinCta(data, props.joinPending);
  const banner = groupBanner(data);
  const door = cta?.door;
  const manage = groupManageActions(data);

  return (
    <View style={{ gap: spacing.compact }}>
      <ScreenHeader nav="back" fallback="/groups">
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

      {data.membership || groupHomeCanManageInvites(data) ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {groupHomeCanManageInvites(data) ? (
            <Button
              label="Invite"
              size="sm"
              variant="outline"
              onPress={props.onInvite}
            />
          ) : null}
          {data.membership ? (
            <Button
              label="Leave Group"
              size="sm"
              variant="outline"
              onPress={props.onLeave}
            />
          ) : null}
        </View>
      ) : null}

      {manage.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {manage.includes("change_image") ? (
            <Button
              label="Change image"
              size="sm"
              variant="outline"
              pending={props.admin.imagePending}
              onPress={props.admin.onChangeImage}
            />
          ) : null}
          {manage.includes("remove_image") ? (
            <Button
              label="Remove image"
              size="sm"
              variant="outline"
              disabled={props.admin.imagePending}
              onPress={props.admin.onRemoveImage}
            />
          ) : null}
          {manage.includes("delete") ? (
            <Button
              label="Delete Group"
              size="sm"
              variant="outline"
              onPress={props.admin.onDelete}
            />
          ) : null}
        </View>
      ) : null}

      {banner ? (
        <Surface style={{ gap: 4 }}>
          {banner.heading ? (
            <Text weight="semibold">{banner.heading}</Text>
          ) : null}
          <Text size="meta" tone="muted">
            {banner.body}
          </Text>
        </Surface>
      ) : null}

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
        {TABS.map((entry) => (
          <Button
            key={entry.key}
            label={entry.label}
            size="sm"
            variant={entry.key === props.tab ? "default" : "outline"}
            selected={entry.key === props.tab}
            onPress={() => props.onTabChange(entry.key)}
          />
        ))}
      </View>

      {props.tab === "standing" ? <StandingTab data={data} /> : null}
      {props.tab === "games" ? (
        <GamesTab
          {...props.games}
          upcomingGames={data.upcomingGames}
          isCommunityArchived={data.isCommunityArchived}
          actions={props.actions}
        />
      ) : null}
      {props.tab === "members" && props.saved && data.viewerCanSetLevel ? (
        <SavedLevelBanner
          saved={props.saved}
          onDismiss={props.onDismissSaved}
        />
      ) : null}
      {props.tab === "members" ? (
        <GroupApproverView
          {...props.admin.approver}
          canSetRequiresApproval={data.canSetRequiresApproval}
          requiresApproval={data.requiresApproval}
          canDecideJoinRequests={data.canDecideJoinRequests}
          communityName={data.community?.name ?? null}
          apiOrigin={props.apiOrigin}
        />
      ) : null}
      {props.tab === "members" ? (
        <MembersTab
          leaderboard={data.standing.leaderboard}
          query={props.memberQuery}
          onQueryChange={props.onMemberQueryChange}
          apiOrigin={props.apiOrigin}
          canSetLevel={data.viewerCanSetLevel}
          onSetLevel={props.onSetLevel}
        />
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
    </View>
  );
}
