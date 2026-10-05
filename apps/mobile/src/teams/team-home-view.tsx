import { spacing } from "@repo/design-tokens";
import {
  TEAM_DISSOLVE_LABEL,
  TEAM_INVITE_PARTNER_LABEL,
  TEAM_NO_MEMBERS_COPY,
  TEAM_REQUEST_LINK_DESCRIPTION,
  TEAM_REQUEST_LINK_LABEL,
  TEAM_REQUEST_LINK_SUBMIT_LABEL,
  TEAM_UNLINK_LABEL,
  TEAM_WAITING_COPY,
  type TeamHomeView as TeamHomeViewData,
} from "@repo/domain/teams";
import type { TeamLinkCommunityPicker } from "@repo/domain/team-link-community-picker";
import { NO_LINKABLE_COMMUNITY_COPY } from "@repo/domain/team-link-community-picker";
import { View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Section } from "../primitives/section";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TeamAvatars } from "./team-avatars";

export type LinkCommunity = { id: string; name: string };

export type TeamHomeViewProps = {
  view: TeamHomeViewData;
  linkOpen: boolean;
  linkPicker: TeamLinkCommunityPicker<LinkCommunity>;
  linkPickerMessage: string | null;
  selectedCommunityId: string | null;
  linkError: string | null;
  linkPending: boolean;
  confirm: ConfirmRequest | null;
  confirmPending: boolean;
  actionError: string | null;
  onInvite: () => void;
  onOpenLink: () => void;
  onCloseLink: () => void;
  onSelectCommunity: (communityId: string) => void;
  onSubmitLink: () => void;
  onRetryCommunities: () => void;
  onUnlink: () => void;
  onDissolve: () => void;
  onCloseConfirm: () => void;
};

function Stats({ stats }: { stats: TeamHomeViewData["stats"] }) {
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View style={{ flexDirection: "row" }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1, flexDirection: "row" }}>
            <View
              accessible
              accessibilityLabel={`${stat.label} ${stat.value}`}
              style={{
                flex: 1,
                gap: 2,
                paddingVertical: 14,
                paddingHorizontal: 8,
              }}
            >
              <Text size="figure" width="expanded" weight="bold">
                {stat.value}
              </Text>
              <Text
                size="eyebrow"
                tone="muted"
                mono
                uppercase
                numberOfLines={2}
              >
                {stat.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Surface>
  );
}

function Members({ members }: { members: TeamHomeViewData["members"] }) {
  if (members.length === 0) {
    return (
      <Notice
        title={TEAM_NO_MEMBERS_COPY.title}
        description={TEAM_NO_MEMBERS_COPY.description}
      />
    );
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {members.map((member, index) => (
        <View key={member.id}>
          {index > 0 ? <Hairline /> : null}
          <View
            accessible
            accessibilityLabel={[
              member.name,
              member.isViewer ? "you" : null,
              member.creatorLabel,
            ]
              .filter(Boolean)
              .join(", ")}
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: spacing.surface,
            }}
          >
            <Avatar name={member.name} uri={member.image} size="lg" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={1}>
                {member.name}
              </Text>
              {member.isViewer ? (
                <Text size="meta" tone="muted">
                  You
                </Text>
              ) : null}
            </View>
            {member.creatorLabel ? (
              <Text size="eyebrow" tone="muted" mono uppercase>
                {member.creatorLabel}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </Surface>
  );
}

function LinkSheet(props: TeamHomeViewProps) {
  const { linkPicker } = props;
  return (
    <Sheet
      visible={props.linkOpen}
      onClose={props.onCloseLink}
      title={TEAM_REQUEST_LINK_LABEL}
    >
      <Text size="meta" tone="muted">
        {TEAM_REQUEST_LINK_DESCRIPTION}
      </Text>
      {props.linkError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.linkError}
        </Text>
      ) : null}
      {linkPicker.status === "loading" ? (
        <Skeleton height={48} radius={12} />
      ) : linkPicker.status === "error" ? (
        <Notice
          alert
          title="Communities could not be loaded"
          description={props.linkPickerMessage}
          onRetry={props.onRetryCommunities}
        />
      ) : linkPicker.status === "empty" ? (
        <Notice
          title="No Community to link"
          description={NO_LINKABLE_COMMUNITY_COPY}
        />
      ) : (
        <View style={{ gap: 12 }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Community"
            style={{ gap: 8 }}
          >
            {linkPicker.communities.map((community) => (
              <Button
                key={community.id}
                label={community.name}
                variant={
                  props.selectedCommunityId === community.id
                    ? "default"
                    : "outline"
                }
                selected={props.selectedCommunityId === community.id}
                disabled={props.linkPending}
                onPress={() => props.onSelectCommunity(community.id)}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row" }}>
            <Button
              label={TEAM_REQUEST_LINK_SUBMIT_LABEL}
              pending={props.linkPending}
              disabled={props.selectedCommunityId == null}
              onPress={props.onSubmitLink}
            />
          </View>
        </View>
      )}
    </Sheet>
  );
}

export function TeamHomeView(props: TeamHomeViewProps) {
  const { view } = props;
  return (
    <View style={{ gap: spacing.section }}>
      <View style={{ gap: spacing.compact }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <TeamAvatars people={view.people} openSeats={view.openSeats} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="h1" weight="bold" accessibilityRole="header">
              {view.title}
            </Text>
          </View>
        </View>
        <Text size="eyebrow" tone="muted" mono uppercase>
          {view.badges.join(" · ")}
        </Text>
        {view.linkedCommunity ? (
          <Text size="meta" tone="muted">
            Linked to {view.linkedCommunity.name}
          </Text>
        ) : null}
        {props.actionError ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {props.actionError}
          </Text>
        ) : null}
        {view.primaryInvite ? (
          <View style={{ flexDirection: "row" }}>
            <Button
              label={TEAM_INVITE_PARTNER_LABEL}
              onPress={props.onInvite}
            />
          </View>
        ) : null}
      </View>

      {view.waitingNote ? (
        <Text size="meta" tone="muted">
          {TEAM_WAITING_COPY}
        </Text>
      ) : null}
      {view.pendingLinkNote ? (
        <Text size="meta" tone="muted">
          {view.pendingLinkNote}
        </Text>
      ) : null}

      <Stats stats={view.stats} />

      <Section title="Members">
        <Members members={view.members} />
      </Section>

      {view.canInvite ||
      view.canRequestLink ||
      view.canUnlink ||
      view.canDissolve ? (
        <Section title="Team actions">
          <View style={{ gap: 8 }}>
            {view.canInvite && !view.primaryInvite ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label="Invite partner"
                  variant="outline"
                  onPress={props.onInvite}
                />
              </View>
            ) : null}
            {view.canRequestLink ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={TEAM_REQUEST_LINK_LABEL}
                  variant="outline"
                  onPress={props.onOpenLink}
                />
              </View>
            ) : null}
            {view.canUnlink ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={TEAM_UNLINK_LABEL}
                  variant="outline"
                  onPress={props.onUnlink}
                />
              </View>
            ) : null}
            {view.canDissolve ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={TEAM_DISSOLVE_LABEL}
                  variant="outline"
                  onPress={props.onDissolve}
                />
              </View>
            ) : null}
          </View>
        </Section>
      ) : null}

      <LinkSheet {...props} />
      <ConfirmSheet
        request={props.confirm}
        pending={props.confirmPending}
        onClose={props.onCloseConfirm}
      />
    </View>
  );
}
