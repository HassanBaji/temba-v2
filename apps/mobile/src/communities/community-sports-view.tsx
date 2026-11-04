import { colors } from "@repo/design-tokens";
import { communitySportsView } from "@repo/domain/community-sports";
import type { Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { SportGlyph } from "../lib/sport-glyph";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export type CommunitySportsViewProps = {
  sports: readonly string[];
  canManage: boolean;
  pendingSport: Sport | null;
  onAdd: (sport: Sport) => void;
  onRemove: (sport: Sport) => void;
};

export function CommunitySportsBlock(props: CommunitySportsViewProps) {
  const m = useMessages();
  const locale = useLocale();
  const view = communitySportsView(props.sports, props.canManage, locale);
  return (
    <Surface style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {m.community.sports.title}
      </Text>
      <Text size="meta" tone="muted">
        {m.community.sports.description}
      </Text>
      {view.rows.map((row, index) => (
        <View key={row.sport}>
          {index > 0 ? <Hairline /> : null}
          <View
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <SportGlyph sport={row.sport} color={colors.ink} />
              <Text>{row.label}</Text>
            </View>
            {view.canRemove ? (
              <Button
                label={m.common.remove}
                accessibilityLabel={m.mobileCommunity.sports.removeA11y(
                  row.label,
                )}
                size="sm"
                variant="outline"
                pending={props.pendingSport === row.sport}
                disabled={props.pendingSport !== null}
                onPress={() => props.onRemove(row.sport)}
              />
            ) : null}
          </View>
        </View>
      ))}
      {view.addable.map((row) => (
        <View key={row.sport} style={{ flexDirection: "row" }}>
          <Button
            label={m.mobileCommunity.sports.add(row.label)}
            variant="outline"
            pending={props.pendingSport === row.sport}
            disabled={props.pendingSport !== null}
            onPress={() => props.onAdd(row.sport)}
          />
        </View>
      ))}
    </Surface>
  );
}
