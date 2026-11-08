import { spacing } from "@repo/design-tokens";
import { sportGlyph } from "@repo/domain/sport";
import { type TeamHomeView as TeamHomeViewData } from "@repo/domain/teams";
import { Plus, X } from "lucide-react-native";
import { useState } from "react";
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
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
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
  onAddMore: () => void;
  onRemoveMember: (
    remove: NonNullable<TeamHomeViewData["members"][number]["remove"]>,
  ) => void;
  onOpenTeam: (teamId: string) => void;
  onRematch: (opponentTeamId: string) => void;
  onOpenGroup: (() => void) | null;
  tagPending: boolean;
  onTag: (groupId: string, toast: string) => void;
  onRemoveTag: (toast: string) => void;
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

function MemberRow({
  member,
  onRemove,
}: {
  member: TeamHomeViewData["members"][number];
  onRemove: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: spacing.surface,
      }}
    >
      <Avatar name={member.name} uri={member.image} size="lg" />
      <View
        accessible
        accessibilityLabel={[
          member.name,
          member.isViewer ? m.common.you : null,
          member.captainLabel,
          member.addedLabel,
          member.phoneMasked,
          member.seatLabel,
          member.levelLabel,
        ]
          .filter(Boolean)
          .join(m.group.metaSeparator)}
        style={{ flex: 1, minWidth: 0 }}
      >
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
        {member.addedLabel ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <NotOnTembaMark />
            {member.phoneMasked ? (
              <Text size="meta" tone="muted" ltr>
                {member.phoneMasked}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {member.captainLabel ? (
        <Text size="eyebrow" tone="muted" mono uppercase>
          {member.captainLabel}
        </Text>
      ) : null}
      {member.remove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={member.remove.label}
          onPress={onRemove}
          hitSlop={12}
        >
          <X size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Roster({
  view,
  onAddMore,
  onRemoveMember,
}: {
  view: TeamHomeViewData;
  onAddMore: () => void;
  onRemoveMember: TeamHomeViewProps["onRemoveMember"];
}) {
  const m = useMessages();
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  if (view.members.length === 0) {
    return (
      <Notice
        title={m.team.noMembers.title}
        description={m.team.noMembers.description}
      />
    );
  }
  const shown = expanded
    ? view.members
    : view.members.slice(0, view.rosterPreview);
  const more = expanded ? null : view.rosterMore;
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {shown.map((member, index) => (
        <View key={member.id}>
          {index > 0 ? <Hairline /> : null}
          <MemberRow
            member={member}
            onRemove={() => {
              if (member.remove) {
                onRemoveMember(member.remove);
              }
            }}
          />
        </View>
      ))}
      {more ? (
        <>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={more}
            onPress={() => setExpanded(true)}
            style={{
              minHeight: 48,
              justifyContent: "center",
              padding: spacing.surface,
            }}
          >
            <Text size="meta" weight="semibold">
              {more}
            </Text>
          </Pressable>
        </>
      ) : null}
      {view.addMore ? (
        <>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[view.addMore.title, view.addMore.detail].join(
              m.group.metaSeparator,
            )}
            onPress={onAddMore}
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: spacing.surface,
            }}
          >
            <Plus size={20} color={colors.ink} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text weight="semibold">{view.addMore.title}</Text>
              <Text size="meta" tone="muted">
                {view.addMore.detail}
              </Text>
            </View>
          </Pressable>
        </>
      ) : null}
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
  onRematch,
}: {
  view: TeamHomeViewData;
  onOpenTeam: (teamId: string) => void;
  onRematch: (opponentTeamId: string) => void;
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
                accessibilityLabel={
                  view.rematch.accessibilityLabels[rival.teamId]
                }
                variant="outline"
                size="sm"
                onPress={() => onRematch(rival.teamId)}
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
        {view.groupTag.line ? (
          props.onOpenGroup ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={view.groupTag.line}
              onPress={props.onOpenGroup}
            >
              <Text size="meta" weight="medium">
                {view.groupTag.line}
              </Text>
            </Pressable>
          ) : (
            <Text size="meta" weight="medium">
              {view.groupTag.line}
            </Text>
          )
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

      <View style={{ gap: 8 }}>
        <Stats stats={view.recordTiles} />
        {view.rosterHero ? (
          <Text size="meta" tone="muted">
            {[view.rosterHero.label, view.roster.status, view.rosterHero.plays]
              .filter(Boolean)
              .join(m.common.listSeparator)}
          </Text>
        ) : null}
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
        <Rivals
          view={view}
          onOpenTeam={props.onOpenTeam}
          onRematch={props.onRematch}
        />
      </Section>

      <Section title={m.team.roster.title}>
        <Roster
          view={view}
          onAddMore={props.onAddMore}
          onRemoveMember={props.onRemoveMember}
        />
      </Section>

      <Section title={m.team.games.title}>
        <Games view={view} />
      </Section>

      {view.canInvite ||
      view.canLeave ||
      view.canDissolve ||
      view.groupTag.options.length > 0 ||
      view.groupTag.remove ? (
        <Section title={m.mobileTeam.home.actionsTitle}>
          <View style={{ gap: 8 }}>
            {view.groupTag.options.map((option) => (
              <View key={option.groupId} style={{ flexDirection: "row" }}>
                <Button
                  label={option.label}
                  variant="outline"
                  disabled={props.tagPending}
                  onPress={() => props.onTag(option.groupId, option.toast)}
                />
              </View>
            ))}
            {view.groupTag.remove ? (
              <View style={{ flexDirection: "row" }}>
                <Button
                  label={view.groupTag.remove.label}
                  variant="outline"
                  disabled={props.tagPending}
                  onPress={() => {
                    if (view.groupTag.remove) {
                      props.onRemoveTag(view.groupTag.remove.toast);
                    }
                  }}
                />
              </View>
            ) : null}
            {view.canInvite && !view.primaryInvite && !view.addMore ? (
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
