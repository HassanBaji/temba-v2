import { sizes, spacing } from "@repo/design-tokens";
import { teamListRowView, type TeamListRowInput } from "@repo/domain/teams";
import { Pressable, View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TeamAvatars } from "./team-avatars";

export type PendingTeamInvite = {
  id: string;
  displayName: string;
  invitedBy: { name: string | null; image: string | null };
};

export type TeamsViewProps = {
  teams: Slot<TeamListRowInput[]>;
  invites: Slot<PendingTeamInvite[]>;
  acceptingId: string | null;
  onOpen: (teamId: string) => void;
  onCreate: () => void;
  onAccept: (inviteId: string) => void;
  onRetry: () => void;
};

function InviteRow({
  invite,
  pending,
  onAccept,
}: {
  invite: PendingTeamInvite;
  pending: boolean;
  onAccept: () => void;
}) {
  const m = useMessages();
  const inviter = invite.invitedBy.name ?? m.team.memberFallback;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: spacing.surface,
      }}
    >
      <Avatar name={inviter} uri={invite.invitedBy.image} size="lg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="lead" weight="semibold" numberOfLines={2}>
          {invite.displayName}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {m.mobileCommunity.teams.invitedBy(inviter)}
        </Text>
      </View>
      <Button
        label={m.invite.inbox.acceptLabel}
        accessibilityLabel={m.mobileCommunity.invites.acceptInviteA11y(
          invite.displayName,
        )}
        pending={pending}
        onPress={onAccept}
      />
    </View>
  );
}

function PendingInvites({
  invites,
  acceptingId,
  onAccept,
  onRetry,
}: Pick<TeamsViewProps, "invites" | "acceptingId" | "onAccept" | "onRetry">) {
  const m = useMessages();
  if (invites.status === "error") {
    return (
      <Notice
        alert
        title={m.invite.inbox.errorTitle}
        description={invites.message}
        onRetry={onRetry}
      />
    );
  }
  if (invites.status !== "ready" || invites.value.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted" accessibilityRole="header">
        {m.mobileCommunity.teams.pendingInvitesTitle}
      </Text>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {invites.value.map((invite, index) => (
          <View key={invite.id}>
            {index > 0 ? <Hairline /> : null}
            <InviteRow
              invite={invite}
              pending={acceptingId === invite.id}
              onAccept={() => onAccept(invite.id)}
            />
          </View>
        ))}
      </Surface>
    </View>
  );
}

function TeamRow({
  team,
  onOpen,
}: {
  team: TeamListRowInput;
  onOpen: (teamId: string) => void;
}) {
  const locale = useLocale();
  const row = teamListRowView(team, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      onPress={() => onOpen(row.id)}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget + 20,
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
        <Text size="lead" weight="semibold" numberOfLines={2}>
          {row.title}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={2}>
          {row.meta}
        </Text>
      </View>
      {row.incompleteLabel ? (
        <Text size="eyebrow" tone="muted" mono uppercase>
          {row.incompleteLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TeamList({
  teams,
  invites,
  onOpen,
  onCreate,
  onRetry,
}: Pick<
  TeamsViewProps,
  "teams" | "invites" | "onOpen" | "onCreate" | "onRetry"
>) {
  const m = useMessages();
  if (teams.status === "loading") {
    return (
      <View
        style={{ gap: 12 }}
        accessibilityLabel={m.mobileCommunity.teams.loadingA11y}
      >
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} height={76} radius={16} />
        ))}
      </View>
    );
  }
  if (teams.status === "error") {
    return (
      <Notice
        alert
        title={m.team.errorTitle}
        description={teams.message}
        onRetry={onRetry}
      />
    );
  }
  if (teams.value.length === 0) {
    const hasInvites = invites.status === "ready" && invites.value.length > 0;
    if (hasInvites) {
      return null;
    }
    return (
      <Surface style={{ gap: 8 }}>
        <Text size="lead" weight="semibold">
          {m.team.empty.title}
        </Text>
        <Text size="meta" tone="muted">
          {m.team.empty.description}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Button label={m.team.createLabel} onPress={onCreate} />
        </View>
      </Surface>
    );
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {teams.value.map((team, index) => (
        <View key={team.id}>
          {index > 0 ? <Hairline /> : null}
          <TeamRow team={team} onOpen={onOpen} />
        </View>
      ))}
    </Surface>
  );
}

export function TeamsView(props: TeamsViewProps) {
  const m = useMessages();
  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <ScreenHeader nav="back" fallback="/profile" title={m.team.title} />
        <Text size="meta" tone="muted">
          {m.team.description}
        </Text>
      </View>
      <View style={{ flexDirection: "row" }}>
        <Button label={m.team.createLabel} onPress={props.onCreate} />
      </View>
      <PendingInvites {...props} />
      <TeamList {...props} />
    </View>
  );
}
