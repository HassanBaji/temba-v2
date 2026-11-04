import { spacing } from "@repo/design-tokens";
import {
  communityArchiveBanner,
  communityAvailableTabs,
  communityCanRequestJoin,
  communityClubGroupRow,
  communityHomeActions,
  communityHomeHeader,
  communityIsMember,
  communityTabLabel,
  communityTeamRow,
} from "@repo/domain/community";
import type { CommunityHomeData } from "@repo/domain/community-data";
import type { CommunityHomeTab } from "@repo/domain/community-home-tab";
import { Pressable, View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TeamAvatars } from "../teams/team-avatars";
import { COMMUNITIES_PATH } from "./communities-model";
import {
  CommunityMembersView,
  type CommunityMembersViewProps,
} from "./community-members-view";
import {
  CommunityRequestsView,
  type CommunityRequestsViewProps,
} from "./community-requests-view";
import {
  CommunitySportsBlock,
  type CommunitySportsViewProps,
} from "./community-sports-view";
import {
  CommunityVenueBlock,
  VenueLinkSheet,
  type VenueLinkSheetProps,
} from "./community-venue-view";

export type CommunityHomeViewProps = {
  data: CommunityHomeData;
  apiOrigin: string;
  tab: CommunityHomeTab;
  onTabChange: (tab: CommunityHomeTab) => void;
  requestCount: number;
  joinPending: boolean;
  actionError: string | null;
  confirm: ConfirmRequest | null;
  confirmPending: boolean;
  unarchivePending: boolean;
  onCloseConfirm: () => void;
  onRequestJoin: () => void;
  onInvite: () => void;
  onCreateClubGroup: () => void;
  onUnarchive: () => void;
  onLeave: () => void;
  onArchive: () => void;
  onOpenGroup: (groupId: string) => void;
  onOpenTeam: (teamId: string) => void;
  onLinkVenue: () => void;
  onUnlinkVenue: () => void;
  members: Omit<
    CommunityMembersViewProps,
    "viewerUserId" | "apiOrigin" | "canManageRoles" | "canInvite" | "onInvite"
  >;
  requests: Omit<
    CommunityRequestsViewProps,
    "apiOrigin" | "canManageJoinRequests" | "canManageTeamLinks"
  >;
  venueSheet: VenueLinkSheetProps;
  sportsBlock: Pick<
    CommunitySportsViewProps,
    "pendingSport" | "onAdd" | "onRemove"
  >;
};

function GroupsTab(props: CommunityHomeViewProps & { canCreate: boolean }) {
  const { data } = props;
  const m = useMessages();
  const locale = useLocale();
  return (
    <View style={{ gap: spacing.compact }}>
      {communityIsMember(data) ? (
        <CommunityVenueBlock
          data={data}
          apiOrigin={props.apiOrigin}
          onLink={props.onLinkVenue}
          onUnlink={props.onUnlinkVenue}
        />
      ) : null}
      {communityIsMember(data) ? (
        <CommunitySportsBlock
          sports={data.sports}
          canManage={data.canManageSports}
          {...props.sportsBlock}
        />
      ) : null}
      {data.groups.length === 0 ? (
        <Notice {...m.community.noGroupsEmpty} />
      ) : (
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {data.groups.map((group, index) => {
            const row = communityClubGroupRow(group, locale);
            return (
              <View key={row.id}>
                {index > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={row.accessibilityLabel}
                  onPress={() => props.onOpenGroup(row.id)}
                  style={({ pressed }) => ({
                    minHeight: 64,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: spacing.surface,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Avatar
                    name={row.name}
                    uri={mediaUrl(row.imageUrl, props.apiOrigin)}
                    size="lg"
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="semibold" numberOfLines={2}>
                      {row.name}
                    </Text>
                    <Text size="meta" tone="muted" numberOfLines={1}>
                      {row.meta}
                    </Text>
                  </View>
                  {row.joined ? (
                    <Text size="eyebrow" tone="muted" mono uppercase>
                      {m.community.joined}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </Surface>
      )}
      {props.canCreate ? (
        <Surface style={{ gap: 8 }}>
          <Text size="lead" weight="semibold">
            {m.community.startClubGroup.title}
          </Text>
          <Text size="meta" tone="muted">
            {m.community.startClubGroup.description}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            <Button
              label={m.community.action.createClubGroup}
              onPress={props.onCreateClubGroup}
            />
          </View>
        </Surface>
      ) : null}
    </View>
  );
}

function TeamsTab(props: CommunityHomeViewProps) {
  const m = useMessages();
  const locale = useLocale();
  if (props.data.teams.length === 0) {
    return <Notice {...m.community.noTeamsEmpty} />;
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {props.data.teams.map((team, index) => {
        const row = communityTeamRow(team, locale);
        return (
          <View key={row.id}>
            {index > 0 ? <Hairline /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={[row.displayName, row.sport]
                .filter(Boolean)
                .join(m.group.metaSeparator)}
              onPress={() => props.onOpenTeam(row.id)}
              style={({ pressed }) => ({
                minHeight: 64,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: spacing.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <TeamAvatars people={row.people} openSeats={row.openSeats} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text weight="semibold" numberOfLines={2}>
                  {row.displayName}
                </Text>
                {row.sport ? (
                  <Text size="meta" tone="muted">
                    {row.sport}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        );
      })}
    </Surface>
  );
}

export function CommunityHomeView(props: CommunityHomeViewProps) {
  const { data } = props;
  const m = useMessages();
  const locale = useLocale();
  const header = communityHomeHeader(data, locale);
  const actions = communityHomeActions(data);
  const banner = communityArchiveBanner(data, locale);
  const tabs = communityAvailableTabs(data);
  const tab = tabs.includes(props.tab) ? props.tab : "groups";

  return (
    <View style={{ gap: spacing.compact }}>
      <ScreenHeader nav="back" fallback={COMMUNITIES_PATH}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar
            name={header.name}
            uri={mediaUrl(data.venue?.logoImageUrl, props.apiOrigin)}
            size="xl"
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="h2" weight="bold" accessibilityRole="header">
              {header.name}
            </Text>
            {header.meta ? (
              <Text size="meta" tone="muted">
                {header.meta}
              </Text>
            ) : null}
            {header.badges.length > 0 ? (
              <Text size="eyebrow" tone="muted" mono uppercase>
                {header.badges.join(" · ")}
              </Text>
            ) : null}
          </View>
        </View>
      </ScreenHeader>

      {actions.canInvite ||
      actions.canUnarchive ||
      actions.canLeave ||
      actions.canSoftArchive ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {actions.canInvite ? (
            <Button
              label={m.community.action.manageInvites}
              size="sm"
              variant="outline"
              onPress={props.onInvite}
            />
          ) : null}
          {actions.canUnarchive ? (
            <Button
              label={m.community.action.unarchive}
              size="sm"
              variant="outline"
              pending={props.unarchivePending}
              onPress={props.onUnarchive}
            />
          ) : null}
          {actions.canLeave ? (
            <Button
              label={m.community.action.leave}
              size="sm"
              variant="outline"
              onPress={props.onLeave}
            />
          ) : null}
          {actions.canSoftArchive ? (
            <Button
              label={m.community.action.softArchive}
              size="sm"
              variant="outline"
              onPress={props.onArchive}
            />
          ) : null}
        </View>
      ) : null}

      {props.actionError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.actionError}
        </Text>
      ) : null}

      {banner ? (
        <Surface style={{ gap: 4 }}>
          <Text weight="semibold">{banner.heading}</Text>
          <Text size="meta" tone="muted">
            {banner.body}
          </Text>
        </Surface>
      ) : null}

      {communityCanRequestJoin(data) ? (
        <Button
          label={m.community.action.requestJoin}
          size="lg"
          pending={props.joinPending}
          onPress={props.onRequestJoin}
        />
      ) : null}

      {tabs.length > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {tabs.map((entry) => (
            <Button
              key={entry}
              label={communityTabLabel(entry, props.requestCount, locale)}
              size="sm"
              variant={entry === tab ? "default" : "outline"}
              selected={entry === tab}
              onPress={() => props.onTabChange(entry)}
            />
          ))}
        </View>
      ) : null}

      {tab === "groups" ? (
        <GroupsTab {...props} canCreate={actions.canCreateClubGroup} />
      ) : null}
      {tab === "teams" ? <TeamsTab {...props} /> : null}
      {tab === "members" ? (
        <CommunityMembersView
          {...props.members}
          viewerUserId={data.membership?.userId}
          apiOrigin={props.apiOrigin}
          canManageRoles={data.canManageRoles}
          canInvite={actions.canInvite}
          onInvite={props.onInvite}
        />
      ) : null}
      {tab === "requests" ? (
        <CommunityRequestsView
          {...props.requests}
          apiOrigin={props.apiOrigin}
          canManageJoinRequests={data.canManageJoinRequests}
          canManageTeamLinks={data.canManageTeamLinks}
        />
      ) : null}

      <VenueLinkSheet {...props.venueSheet} />
      <ConfirmSheet
        request={props.confirm}
        pending={props.confirmPending}
        onClose={props.onCloseConfirm}
      />
    </View>
  );
}
