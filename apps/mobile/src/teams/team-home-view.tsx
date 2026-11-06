import { spacing } from "@repo/design-tokens";
import { sportGlyph } from "@repo/domain/sport";
import { type TeamHomeView as TeamHomeViewData } from "@repo/domain/teams";
import type { TeamLinkCommunityPicker } from "@repo/domain/team-link-community-picker";
import { noLinkableCommunityCopy } from "@repo/domain/team-link-community-picker";
import { View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { SportGlyph } from "../lib/sport-glyph";
import { Hairline } from "../primitives/hairline";
import { ScreenHeader } from "../primitives/screen-header";
import { Section } from "../primitives/section";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { TeamAvatars } from "./team-avatars";
import { TEAMS_PATH } from "./teams-model";

export type LinkCommunity = { id: string; name: string };

export type TeamHomeViewProps = {
  view: TeamHomeViewData;
  sport: string;
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
  onLeave: () => void;
  onCloseConfirm: () => void;
};

function Stats({ stats }: { stats: TeamHomeViewData["stats"] }) {
  const m = useMessages();
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View style={{ flexDirection: "row" }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1, flexDirection: "row" }}>
            <View
              accessible
              accessibilityLabel={m.mobileCommunity.team.statA11y(
                stat.label,
                stat.value,
              )}
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
  const m = useMessages();
  if (members.length === 0) {
    return (
      <Notice
        title={m.team.noMembers.title}
        description={m.team.noMembers.description}
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
              member.isViewer ? m.common.you : null,
              member.creatorLabel,
            ]
              .filter(Boolean)
              .join(m.group.metaSeparator)}
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
                  {m.common.you}
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
  const m = useMessages();
  const locale = useLocale();
  return (
    <Sheet
      visible={props.linkOpen}
      onClose={props.onCloseLink}
      title={m.team.requestLinkLabel}
    >
      <Text size="meta" tone="muted">
        {m.team.requestLinkDescription}
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
          title={m.community.errorTitle}
          description={props.linkPickerMessage}
          onRetry={props.onRetryCommunities}
        />
      ) : linkPicker.status === "empty" ? (
        <Notice
          title={m.mobileCommunity.team.noCommunityToLink}
          description={noLinkableCommunityCopy(locale)}
        />
      ) : (
        <View style={{ gap: 12 }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={m.community.fallbackName}
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
              label={m.team.requestLinkSubmitLabel}
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
  const m = useMessages();
  const colors = useColors();
  return (
    <View style={{ gap: spacing.section }}>
      <View style={{ gap: spacing.compact }}>
        <ScreenHeader nav="back" fallback={TEAMS_PATH}>
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
        </ScreenHeader>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {sportGlyph(props.sport) ? (
            <SportGlyph sport={props.sport} color={colors.muted} />
          ) : null}
          <Text size="eyebrow" tone="muted" mono uppercase>
            {view.badges.join(" · ")}
          </Text>
        </View>
        {view.linkedCommunity ? (
          <Text size="meta" tone="muted">
            {m.mobileCommunity.team.linkedTo(view.linkedCommunity.name)}
          </Text>
        ) : null}
        {props.actionError ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {props.actionError}
          </Text>
        ) : null}
        {view.primaryInvite ? (
          <View style={{ flexDirection: "row" }}>
            <Button label={view.inviteLabel} onPress={props.onInvite} />
          </View>
        ) : null}
      </View>

      {view.waitingNote ? (
        <Text size="meta" tone="muted">
          {view.waitingCopy}
        </Text>
      ) : null}
      {view.requestLinkHint ? (
        <Text size="meta" tone="muted">
          {view.requestLinkHint}
        </Text>
      ) : null}
      {view.pendingLinkNote ? (
        <Text size="meta" tone="muted">
          {view.pendingLinkNote}
        </Text>
      ) : null}

      <Stats stats={view.stats} />

      <Section title={m.community.tab.members}>
        {view.roster.label ? (
          <Text size="eyebrow" tone="muted" mono uppercase>
            {[view.roster.label, view.roster.status]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}
        <Members members={view.members} />
      </Section>

      {view.canInvite ||
      view.canRequestLink ||
      view.canUnlink ||
      view.canLeave ||
      view.canDissolve ? (
        <Section title={m.mobileCommunity.team.actionsTitle}>
          <View style={{ gap: 8 }}>
            {view.canInvite && !view.primaryInvite ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={view.inviteLabel}
                  variant="outline"
                  onPress={props.onInvite}
                />
              </View>
            ) : null}
            {view.canRequestLink ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={m.team.requestLinkLabel}
                  variant="outline"
                  onPress={props.onOpenLink}
                />
              </View>
            ) : null}
            {view.canUnlink ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={m.team.unlinkLabel}
                  variant="outline"
                  onPress={props.onUnlink}
                />
              </View>
            ) : null}
            {view.canLeave ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={m.team.leaveLabel}
                  variant="outline"
                  onPress={props.onLeave}
                />
              </View>
            ) : null}
            {view.canDissolve ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={m.team.dissolveLabel}
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
