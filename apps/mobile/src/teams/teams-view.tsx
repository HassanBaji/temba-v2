import { sizes, spacing } from "@repo/design-tokens";
import {
  TEAMS_DESCRIPTION,
  TEAMS_EMPTY_COPY,
  TEAMS_ERROR_TITLE,
  TEAMS_TITLE,
  TEAM_CREATE_LABEL,
  teamListRowView,
  type TeamListRowInput,
} from "@repo/domain/teams";
import { Pressable, View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
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
  const inviter = invite.invitedBy.name ?? "Member";
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
          Invited by {inviter}
        </Text>
      </View>
      <Button
        label="Accept"
        accessibilityLabel={`Accept the invite to ${invite.displayName}`}
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
  if (invites.status === "error") {
    return (
      <Notice
        alert
        title="Invites could not be loaded"
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
        Invites to join a Team
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
  const row = teamListRowView(team);
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
  if (teams.status === "loading") {
    return (
      <View style={{ gap: 12 }} accessibilityLabel="Loading Teams">
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
        title={TEAMS_ERROR_TITLE}
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
          {TEAMS_EMPTY_COPY.title}
        </Text>
        <Text size="meta" tone="muted">
          {TEAMS_EMPTY_COPY.description}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Button label={TEAM_CREATE_LABEL} onPress={onCreate} />
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
  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <Text size="h1" weight="bold" accessibilityRole="header">
          {TEAMS_TITLE}
        </Text>
        <Text size="meta" tone="muted">
          {TEAMS_DESCRIPTION}
        </Text>
      </View>
      <View style={{ flexDirection: "row" }}>
        <Button label={TEAM_CREATE_LABEL} onPress={props.onCreate} />
      </View>
      <PendingInvites {...props} />
      <TeamList {...props} />
    </View>
  );
}
