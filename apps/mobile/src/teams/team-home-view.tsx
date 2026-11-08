import { spacing } from "@repo/design-tokens";
import { sportGlyph } from "@repo/domain/sport";
import { type TeamHomeView as TeamHomeViewData } from "@repo/domain/teams";
import { Pressable, View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { FormSlot } from "../primitives/form-slot";
import { ResultMark } from "../primitives/result-mark";
import { SportGlyph } from "../lib/sport-glyph";
import { Hairline } from "../primitives/hairline";
import { ScreenHeader } from "../primitives/screen-header";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { TeamAvatars } from "./team-avatars";
import { TEAMS_PATH } from "./teams-model";

export type TeamHomeViewProps = {
  view: TeamHomeViewData;
  sport: string;
  confirm: ConfirmRequest | null;
  confirmPending: boolean;
  actionError: string | null;
  onInvite: () => void;
  onOpenTeam: (teamId: string) => void;
  onDissolve: () => void;
  onLeave: () => void;
  onCloseConfirm: () => void;
};

function Stats({ stats }: { stats: TeamHomeViewData["recordTiles"] }) {
  const m = useMessages();
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View style={{ flexDirection: "row" }}>
        {stats.map((stat) => (
          <View key={stat.key} style={{ flex: 1, flexDirection: "row" }}>
            <View
              accessible
              accessibilityLabel={m.mobileTeam.home.statA11y(
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
              member.captainLabel,
              member.seatLabel,
              member.levelLabel,
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
              {member.isViewer || member.seatLabel || member.levelLabel ? (
                <Text size="meta" tone="muted" numberOfLines={1}>
                  {[
                    member.isViewer ? m.common.you : null,
                    member.seatLabel,
                    member.levelLabel,
                  ]
                    .filter(Boolean)
                    .join(m.common.listSeparator)}
                </Text>
              ) : null}
            </View>
            {member.captainLabel ? (
              <Text size="eyebrow" tone="muted" mono uppercase>
                {member.captainLabel}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </Surface>
  );
}

function FormLine({ form }: { form: TeamHomeViewData["form"] }) {
  const m = useMessages();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {form.slots.map((slot) => (
          <FormSlot key={slot.key} variant={slot.variant} compact />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="eyebrow" tone="muted">
          {m.team.form.older}
        </Text>
        <Text size="eyebrow" tone="muted">
          {m.team.form.latest}
        </Text>
      </View>
      {form.emptyCopy ? (
        <Text size="meta" tone="muted">
          {form.emptyCopy}
        </Text>
      ) : null}
    </View>
  );
}

function Rivals({
  view,
  onOpenTeam,
}: {
  view: TeamHomeViewData;
  onOpenTeam: (teamId: string) => void;
}) {
  const m = useMessages();
  if (view.rivals.length === 0) {
    return (
      <Text size="meta" tone="muted">
        {view.closestLine ?? view.rivalsEmptyCopy}
      </Text>
    );
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {view.rivals.map((rival, index) => (
        <View key={rival.teamId}>
          {index > 0 ? <Hairline /> : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: spacing.surface,
            }}
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={rival.accessibilityLabel}
              onPress={() => onOpenTeam(rival.teamId)}
              style={{
                flex: 1,
                minWidth: 0,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text weight="semibold" numberOfLines={1}>
                  {rival.name}
                </Text>
                <Text size="meta" tone="muted" numberOfLines={1}>
                  {[rival.played, rival.last].join(m.common.listSeparator)}
                </Text>
              </View>
              <Text size="title" weight="bold">
                {rival.headToHead}
              </Text>
            </Pressable>
            {view.rematch ? (
              <Button
                label={view.rematch.label}
                variant="outline"
                size="sm"
                disabled={view.rematch.disabled}
              />
            ) : null}
          </View>
        </View>
      ))}
    </Surface>
  );
}

function Games({ view }: { view: TeamHomeViewData }) {
  const m = useMessages();
  if (view.games.length === 0) {
    return (
      <Text size="meta" tone="muted">
        {view.gamesEmptyCopy}
      </Text>
    );
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {view.games.map((game, index) => (
        <View key={game.key}>
          {index > 0 ? <Hairline /> : null}
          <View
            accessible
            accessibilityLabel={[game.opponentName, game.meta, game.scoreLine]
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
            <ResultMark variant={game.result} decorative />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text weight="semibold" numberOfLines={1}>
                {game.opponentName}
              </Text>
              <Text size="meta" tone="muted" numberOfLines={1}>
                {game.meta}
              </Text>
            </View>
            <Text weight="semibold">{game.scoreLine}</Text>
          </View>
        </View>
      ))}
    </Surface>
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

      <View style={{ gap: 8 }}>
        <Stats stats={view.recordTiles} />
        {view.teamLevel ? (
          <Text size="meta" tone="muted">
            {view.teamLevel}
          </Text>
        ) : null}
      </View>

      <Section title={m.team.form.title}>
        <FormLine form={view.form} />
      </Section>

      <Section title={m.team.rivals.title}>
        <Rivals view={view} onOpenTeam={props.onOpenTeam} />
      </Section>

      <Section title={m.team.roster.title}>
        {view.roster.label ? (
          <Text size="eyebrow" tone="muted" mono uppercase>
            {[view.roster.label, view.roster.status]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}
        <Members members={view.members} />
      </Section>

      <Section title={m.team.games.title}>
        <Games view={view} />
      </Section>

      {view.canInvite || view.canLeave || view.canDissolve ? (
        <Section title={m.mobileTeam.home.actionsTitle}>
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

      <ConfirmSheet
        request={props.confirm}
        pending={props.confirmPending}
        onClose={props.onCloseConfirm}
      />
    </View>
  );
}
