import type { Sport } from "@repo/domain/sport";
import {
  teamGroupChoiceRows,
  teamSquadCountLine,
  teamSquadPickRows,
  type TeamGroupChoice,
  type TeamGroupMemberToAdd,
  type TeamRosterDraft,
} from "@repo/domain/team-roster-draft";
import { Check, Tag } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Switch, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { useColors } from "../theme/theme-provider";
import {
  CreateTeamCard,
  CreateTeamSection,
  CreateTeamTile,
} from "./create-team-parts";

const VISIBLE_ROWS = 8;

/** Team from a group: pick a Group you organize, tick the squad, tag it. */
export function CreateTeamFromGroup({
  groups,
  loading,
  groupId,
  onGroupChange,
  draft,
  sport,
  captainName,
  onToggle,
  tagged,
  onTaggedChange,
  disabled,
}: {
  groups: readonly TeamGroupChoice[];
  loading: boolean;
  groupId: string | null;
  onGroupChange: (group: TeamGroupChoice) => void;
  draft: TeamRosterDraft;
  sport: Sport;
  captainName: string;
  onToggle: (member: TeamGroupMemberToAdd, groupName: string) => void;
  tagged: boolean;
  onTaggedChange: (tagged: boolean) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const c = m.team.create.group;
  const [expanded, setExpanded] = useState(false);
  const choices = teamGroupChoiceRows(groups, locale);
  const selected = choices.find((choice) => choice.id === groupId) ?? null;

  const members = api.teams.listGroupMembersToAdd.useQuery(
    { groupId: groupId ?? "" },
    { enabled: groupId != null },
  );
  const memberRows = members.data?.members ?? [];
  const rows = teamSquadPickRows(
    { captainName, members: memberRows, draft, sport },
    locale,
  );
  const visible = expanded ? rows : rows.slice(0, VISIBLE_ROWS);
  const hidden = rows.length - visible.length;
  const tag = selected ? c.tag(selected.name) : null;

  return (
    <View style={{ gap: 26 }}>
      <CreateTeamSection title={c.title} aside={c.organize(groups.length)}>
        {groups.length === 0 ? (
          <Text size="meta" tone="muted">
            {loading ? m.team.create.lookingUp : c.empty}
          </Text>
        ) : (
          <CreateTeamCard>
            <View accessibilityRole="radiogroup" accessibilityLabel={c.title}>
              {choices.map((choice, index) => {
                const checked = choice.id === groupId;
                return (
                  <View key={choice.id}>
                    {index > 0 ? <Hairline /> : null}
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked, disabled }}
                      accessibilityLabel={[choice.name, choice.meta].join(
                        m.common.listSeparator,
                      )}
                      disabled={disabled}
                      onPress={() => {
                        setExpanded(false);
                        onGroupChange(groups[index]!);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        backgroundColor: checked ? colors.wash : colors.paper,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: hairline,
                          borderColor: checked
                            ? colors.controlEdge
                            : colors.inputBorder,
                          backgroundColor: checked ? colors.control : undefined,
                        }}
                      >
                        {checked ? (
                          <View
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 4,
                              backgroundColor: colors.onControl,
                            }}
                          />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text weight="semibold" numberOfLines={1}>
                          {choice.name}
                        </Text>
                        <Text size="eyebrow" tone="muted">
                          {choice.meta}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </CreateTeamCard>
        )}
      </CreateTeamSection>

      {selected ? (
        <CreateTeamSection
          title={c.squadTitle}
          aside={teamSquadCountLine(draft, sport, locale)}
        >
          {members.error ? (
            <Text size="meta" weight="medium" style={{ marginBottom: 8 }}>
              {members.error.message}
            </Text>
          ) : null}
          <CreateTeamCard>
            {visible.map((row, index) => {
              const member = memberRows.find(
                (entry) => entry.userId === row.userId,
              );
              return (
                <View key={row.userId}>
                  {index > 0 ? <Hairline /> : null}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: row.picked,
                      disabled: disabled || row.disabled,
                    }}
                    accessibilityLabel={[row.name, row.meta]
                      .filter(Boolean)
                      .join(m.common.listSeparator)}
                    disabled={disabled || row.disabled}
                    onPress={() => {
                      if (member) {
                        onToggle(member, selected.name);
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: row.picked
                          ? colors.control
                          : undefined,
                        borderWidth: row.picked ? 0 : hairline,
                        borderColor: colors.inputBorder,
                        opacity: row.disabled && !row.picked ? 0.5 : 1,
                      }}
                    >
                      {row.picked ? (
                        <Check size={14} color={colors.onControl} />
                      ) : null}
                    </View>
                    <CreateTeamTile
                      tone={row.isCaptain ? "in" : "plain"}
                      initials={row.initials}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text weight="semibold" numberOfLines={1}>
                        {row.name}
                      </Text>
                      {row.meta ? (
                        <Text size="eyebrow" tone="muted">
                          {row.meta}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </CreateTeamCard>
          {members.isPending ? (
            <Text size="eyebrow" tone="muted" style={{ marginTop: 8 }}>
              {m.team.create.lookingUp}
            </Text>
          ) : hidden > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(true)}
              hitSlop={12}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            >
              <Text size="eyebrow" tone="muted">
                {c.more(hidden)}
              </Text>
            </Pressable>
          ) : null}
        </CreateTeamSection>
      ) : null}

      {tag ? (
        <CreateTeamCard
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Tag size={16} color={colors.ink} />
          <Text size="meta" tone="muted" style={{ flex: 1 }}>
            {tag.before}
            <Text size="meta" weight="semibold">
              {tag.strong}
            </Text>
            {tag.after}
          </Text>
          <Switch
            accessibilityLabel={m.team.groupTag.tagAs(selected?.name ?? "")}
            value={tagged}
            disabled={disabled}
            onValueChange={onTaggedChange}
            trackColor={{ false: colors.rule, true: colors.ink }}
            thumbColor={tagged ? colors.paper : colors.onControl}
            ios_backgroundColor={colors.rule}
          />
        </CreateTeamCard>
      ) : null}
    </View>
  );
}
