import { spacing } from "@repo/design-tokens";
import { type GroupTeamData } from "@repo/domain/group-data";
import { groupTeamRowView } from "@repo/domain/teams";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

/** Teams tagged to the Group, for members; Organizers also get Create team. */
export function GroupTeamsRow({
  teams,
  isMember,
  canCreateTeam,
  onOpenTeam,
  onCreateTeam,
}: {
  teams: GroupTeamData[];
  isMember: boolean;
  canCreateTeam: boolean;
  onOpenTeam: (teamId: string) => void;
  onCreateTeam: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (!canCreateTeam && (!isMember || teams.length === 0)) {
    return null;
  }
  const rows = teams.map((team) => groupTeamRowView(team, locale));
  return (
    <Section title={m.group.teams.title}>
      {rows.length === 0 ? (
        <Text size="meta" tone="muted">
          {m.group.teams.empty}
        </Text>
      ) : (
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {rows.map((row, index) => (
            <View key={row.id}>
              {index > 0 ? <Hairline /> : null}
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={row.accessibilityLabel}
                onPress={() => onOpenTeam(row.id)}
                style={{
                  minHeight: 56,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: spacing.surface,
                }}
              >
                <Avatar name={row.title} size="lg" />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text weight="semibold" numberOfLines={1}>
                    {row.title}
                  </Text>
                  <Text size="meta" tone="muted" numberOfLines={1}>
                    {row.meta}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
        </Surface>
      )}
      {canCreateTeam ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={m.group.teams.createLabel}
            variant="outline"
            size="sm"
            onPress={onCreateTeam}
          />
        </View>
      ) : null}
    </Section>
  );
}
