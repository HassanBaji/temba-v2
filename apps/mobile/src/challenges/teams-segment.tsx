import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  challengeTeamInviteView,
  challengeTeamRowView,
  type ChallengeTeamInviteInput,
  type ChallengeTeamRowInput,
} from "@repo/domain/challenges-tab";
import {
  teamCreateFromGroupOptions,
  type TeamGroupTagInput,
} from "@repo/domain/teams";
import { Eye, Mail, Plus, Users } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";

import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const ROW_PADDING = { paddingHorizontal: 16, paddingVertical: 14 } as const;
const SKETCH = { pair: 34, side: 22 } as const;
const FOOTBALL_OPEN_SEATS = 5;

export type PendingTeamInvite = ChallengeTeamInviteInput;

export type TeamsSegmentProps = {
  teams: Slot<ChallengeTeamRowInput[]>;
  invites: Slot<PendingTeamInvite[]>;
  organizedGroups: readonly TeamGroupTagInput[];
  viewerName?: string | null;
  acceptingId: string | null;
  onOpenTeam: (teamId: string) => void;
  onCreate: (groupId?: string) => void;
  onAccept: (inviteId: string) => void;
  onRetry: () => void;
};

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 10,
      }}
    >
      <Text
        size="title"
        width="expanded"
        accessibilityRole="header"
        style={{ flexShrink: 1 }}
      >
        {title}
      </Text>
      {hint ? (
        <Text size="meta" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function TeamRow({
  team,
  onOpen,
}: {
  team: ChallengeTeamRowInput;
  onOpen: (teamId: string) => void;
}) {
  const locale = useLocale();
  const view = challengeTeamRowView(team, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={view.accessibilityLabel}
      onPress={() => onOpen(view.id)}
      style={({ pressed }) => ({
        ...ROW_PADDING,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <InitialsTile name={view.title} size="xl" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={2}>
          {view.title}
        </Text>
        <Text size="eyebrow" tone="muted" style={{ marginTop: 2 }}>
          {view.line}
        </Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ alignItems: "flex-end" }}
      >
        <Text size="lead" width="expanded" ltr>
          {view.record.value}
        </Text>
        <Text size="eyebrow" tone="muted">
          {view.record.label}
        </Text>
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
  const locale = useLocale();
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
    <View>
      <SectionHead
        title={m.challenge.teams.invitedTitle}
        hint={m.challenge.tab.teams.pending(invites.value.length)}
      />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {invites.value.map((invite, index) => {
          const view = challengeTeamInviteView(invite, locale);
          return (
            <View key={view.id}>
              {index > 0 ? <Hairline /> : null}
              <View
                style={{
                  ...ROW_PADDING,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <InitialsTile name={view.title} size="xl" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="semibold" numberOfLines={2}>
                    {view.title}
                  </Text>
                  <Text size="eyebrow" tone="muted" style={{ marginTop: 2 }}>
                    {view.line}
                  </Text>
                </View>
                <Button
                  label={m.challenge.teams.join}
                  accessibilityLabel={view.joinA11y}
                  size="sm"
                  pending={acceptingId === view.id}
                  onPress={() => onAccept(view.id)}
                />
              </View>
            </View>
          );
        })}
      </Surface>
    </View>
  );
}

/** 1d's tiles: you, then the seats a padel pair and a football side still need. */
function SeatsSketch({ viewerName }: { viewerName: string }) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        <InitialsTile name={viewerName} size="md" tone="inverse" />
        <View style={{ width: SKETCH.pair, height: SKETCH.pair }}>
          <Hatch radius={radii.md} />
        </View>
      </View>
      <Text size="eyebrow" tone="muted">
        {m.challenge.tab.sports.padel}
      </Text>
      <View
        style={{
          width: hairline,
          height: 24,
          backgroundColor: palette.rule,
          marginHorizontal: 4,
        }}
      />
      <View style={{ flexDirection: "row", gap: 4 }}>
        <InitialsTile name={viewerName} size="2xs" tone="inverse" />
        {Array.from({ length: FOOTBALL_OPEN_SEATS }, (_, index) => (
          <View key={index} style={{ width: SKETCH.side, height: SKETCH.side }}>
            <Hatch radius={radii.slot} />
          </View>
        ))}
      </View>
      <Text size="eyebrow" tone="muted">
        {m.challenge.tab.sports.football}
      </Text>
    </View>
  );
}

function InfoRow({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ size: number; color: ColorValue }>;
  label: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        ...ROW_PADDING,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Icon size={sizes.iconRow} color={colors.muted} />
      <Text size="meta" tone="muted" style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/** 1d: no Team yet. The ways to make one on black, then what you can do until then. */
function NoTeamYet({
  organizedGroups,
  viewerName,
  invited,
  onCreate,
}: Pick<TeamsSegmentProps, "organizedGroups" | "onCreate"> & {
  viewerName: string;
  invited: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.tab.teams;
  const colors = useColors();
  return (
    <View style={{ gap: 22 }}>
      <Surface
        tone="ink"
        padded={false}
        radius="sheet"
        style={{ paddingHorizontal: 20, paddingVertical: 22, gap: 18 }}
      >
        <View style={{ gap: 8 }}>
          <Text size="h2" width="expanded" accessibilityRole="header">
            {copy.emptyTitle}
          </Text>
          <Text tone="muted">{copy.emptyCopy}</Text>
        </View>
        <SeatsSketch viewerName={viewerName} />
        <Button
          label={m.challenge.teams.createFirst}
          size="lg"
          onPress={() => onCreate()}
        />
        {teamCreateFromGroupOptions(organizedGroups, locale).map((option) => (
          <Button
            key={option.groupId}
            label={option.label}
            variant="outline-inverse"
            size="lg"
            icon={<Users size={sizes.iconRow} color={colors.onFocus} />}
            onPress={() => onCreate(option.groupId)}
          />
        ))}
      </Surface>
      <View>
        <Text size="meta" tone="muted" style={{ paddingBottom: 10 }}>
          {copy.untilThen}
        </Text>
        <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
          <InfoRow icon={Eye} label={copy.browse} />
          {invited ? null : (
            <>
              <Hairline />
              <InfoRow icon={Mail} label={copy.invites} />
            </>
          )}
        </Surface>
      </View>
    </View>
  );
}

function CreateTeamRow({ onPress }: { onPress: () => void }) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Plus size={sizes.iconRow} color={colors.ink} />
      <Text weight="semibold">{m.challenge.teams.createTeam}</Text>
    </Pressable>
  );
}

/** 1c: your Teams with their records, Create team, the Teams you're invited to, and the footnote. */
export function TeamsSegment(props: TeamsSegmentProps) {
  const m = useMessages();
  const { teams, invites } = props;
  if (teams.status === "loading") {
    return (
      <View
        style={{ gap: 12 }}
        accessibilityLabel={m.mobileChallenge.loadingTeamsA11y}
      >
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} height={72} radius={radii.card} />
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
        onRetry={props.onRetry}
      />
    );
  }
  if (teams.value.length === 0) {
    return (
      <View style={{ gap: spacing.section }}>
        <NoTeamYet
          organizedGroups={props.organizedGroups}
          viewerName={props.viewerName ?? m.challenge.tab.teams.you}
          invited={invites.status === "ready" && invites.value.length > 0}
          onCreate={props.onCreate}
        />
        <InvitedTo {...props} />
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.section }}>
      <View style={{ gap: 10 }}>
        <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
          {teams.value.map((team, index) => (
            <View key={team.id}>
              {index > 0 ? <Hairline /> : null}
              <TeamRow team={team} onOpen={props.onOpenTeam} />
            </View>
          ))}
        </Surface>
        <CreateTeamRow onPress={() => props.onCreate()} />
      </View>
      <InvitedTo {...props} />
      <Text size="eyebrow" tone="muted">
        {m.challenge.tab.teams.footnote}
      </Text>
    </View>
  );
}
