import { spacing } from "@repo/design-tokens";
import type { GroupHomeData } from "@repo/domain/group-data";
import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import { groupHomeCanManageInvites } from "@repo/domain/group-home-cta";
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
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { GamesTab, type GamesTabProps } from "./games-tab";
import { groupBanner, groupHomeHeader, groupJoinCta } from "./group-home-model";
import { MembersTab } from "./members-tab";
import { StandingTab } from "./standing-tab";

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

  return (
    <View style={{ gap: spacing.compact }}>
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
      {props.tab === "members" ? (
        <MembersTab
          leaderboard={data.standing.leaderboard}
          query={props.memberQuery}
          onQueryChange={props.onMemberQueryChange}
          apiOrigin={props.apiOrigin}
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
