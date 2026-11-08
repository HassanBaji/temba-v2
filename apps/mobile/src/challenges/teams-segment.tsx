import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  teamCardView,
  teamCreateFromGroupOptions,
  type TeamCardInput,
  type TeamGroupTagInput,
} from "@repo/domain/teams";
import { Pressable, View } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Section } from "../primitives/section";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const CREST = 40;

export type PendingTeamInvite = {
  id: string;
  displayName: string;
  invitedBy: { name: string | null };
};

export type TeamsSegmentProps = {
  teams: Slot<TeamCardInput[]>;
  invites: Slot<PendingTeamInvite[]>;
  organizedGroups: readonly TeamGroupTagInput[];
  acceptingId: string | null;
  onOpenTeam: (teamId: string) => void;
  onCreate: (groupId?: string) => void;
  onAccept: (inviteId: string) => void;
  onRetry: () => void;
};

function RecordTile({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        minWidth: sizes.touchTarget + 12,
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: colors.rule,
      }}
    >
      <Text weight="semibold">{value}</Text>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {label}
      </Text>
    </View>
  );
}

function TeamCard({
  team,
  onOpen,
}: {
  team: TeamCardInput;
  onOpen: (teamId: string) => void;
}) {
  const locale = useLocale();
  const card = teamCardView(team, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.accessibilityLabel}
      onPress={() => onOpen(card.id)}
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
        <InitialsTile name={card.title} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="lead" weight="semibold" numberOfLines={2}>
          {card.title}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={2}>
          {card.line}
        </Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <RecordTile label={card.record.label} value={card.record.value} />
      </View>
    </Pressable>
  );
}

function InvitedTo({
  invites,
  acceptingId,
  onAccept,
  onRetry,
}: Pick<
  TeamsSegmentProps,
  "invites" | "acceptingId" | "onAccept" | "onRetry"
>) {
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
    <Section title={m.challenge.teams.invitedTitle}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {invites.value.map((invite, index) => {
          const inviter = invite.invitedBy.name ?? m.team.memberFallback;
          return (
            <View key={invite.id}>
              {index > 0 ? <Hairline /> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: spacing.surface,
                }}
              >
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <InitialsTile name={invite.displayName} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="lead" weight="semibold" numberOfLines={2}>
                    {invite.displayName}
                  </Text>
                  <Text size="meta" tone="muted" numberOfLines={1}>
                    {m.challenge.teams.invitedBy(inviter)}
                  </Text>
                </View>
                <Button
                  label={m.challenge.teams.join}
                  accessibilityLabel={m.challenge.teams.joinA11y(
                    invite.displayName,
                  )}
                  pending={acceptingId === invite.id}
                  onPress={() => onAccept(invite.id)}
                />
              </View>
            </View>
          );
        })}
      </Surface>
    </Section>
  );
}

/** 1d: the first Team drawn as a hatched crest, then the ways to make one. */
function NoTeamYet({
  organizedGroups,
  onCreate,
}: Pick<TeamsSegmentProps, "organizedGroups" | "onCreate">) {
  const m = useMessages();
  const locale = useLocale();
  const fromGroups = teamCreateFromGroupOptions(organizedGroups, locale);
  return (
    <View style={{ gap: spacing.compact }}>
      <Surface style={{ gap: spacing.compact }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <View style={{ width: CREST, height: CREST }}>
            <Hatch radius={radii.md} />
          </View>
          <View style={{ flex: 1, height: 12 }}>
            <Hatch />
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text size="title" weight="semibold" accessibilityRole="header">
            {m.challenge.teams.emptyTitle}
          </Text>
          <Text tone="muted">{m.challenge.teams.emptyCopy}</Text>
        </View>
      </Surface>
      <View style={{ gap: 8 }}>
        <Button
          label={m.challenge.teams.createFirst}
          size="lg"
          onPress={() => onCreate()}
        />
        {fromGroups.map((option) => (
          <Button
            key={option.groupId}
            label={option.label}
            size="lg"
            variant="outline"
            onPress={() => onCreate(option.groupId)}
          />
        ))}
      </View>
    </View>
  );
}

function TeamCards({
  teams,
  invites,
  organizedGroups,
  onOpenTeam,
  onCreate,
  onRetry,
}: Pick<
  TeamsSegmentProps,
  | "teams"
  | "invites"
  | "organizedGroups"
  | "onOpenTeam"
  | "onCreate"
  | "onRetry"
>) {
  const m = useMessages();
  if (teams.status === "loading") {
    return (
      <View
        style={{ gap: 12 }}
        accessibilityLabel={m.mobileChallenge.loadingTeamsA11y}
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
    const invited = invites.status === "ready" && invites.value.length > 0;
    return invited ? (
      <View style={{ flexDirection: "row" }}>
        <Button
          label={m.challenge.teams.createTeam}
          variant="outline"
          onPress={() => onCreate()}
        />
      </View>
    ) : (
      <NoTeamYet organizedGroups={organizedGroups} onCreate={onCreate} />
    );
  }
  return (
    <View style={{ gap: spacing.compact }}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {teams.value.map((team, index) => (
          <View key={team.id}>
            {index > 0 ? <Hairline /> : null}
            <TeamCard team={team} onOpen={onOpenTeam} />
          </View>
        ))}
      </Surface>
      <View style={{ flexDirection: "row" }}>
        <Button
          label={m.challenge.teams.createTeam}
          variant="outline"
          onPress={() => onCreate()}
        />
      </View>
    </View>
  );
}

export function TeamsSegment(props: TeamsSegmentProps) {
  return (
    <View style={{ gap: spacing.section }}>
      <InvitedTo {...props} />
      <TeamCards {...props} />
    </View>
  );
}
