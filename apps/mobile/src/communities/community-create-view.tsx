import { spacing } from "@repo/design-tokens";
import { communityTypeHelp } from "@repo/domain/community";
import type { CommunityVisibility } from "@repo/domain/community-chrome";
import type { Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { ChoiceRow } from "../lib/choice-row";
import { SportToggleRow } from "../lib/sport-toggle-row";
import { Button } from "../primitives/button";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { COMMUNITIES_PATH } from "./communities-model";

export type CommunityCreateViewProps = {
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | null;
  formError: string | null;
  type: CommunityVisibility;
  onTypeChange: (type: CommunityVisibility) => void;
  sports: readonly Sport[];
  onToggleSport: (sport: Sport) => void;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function CommunityCreateView(props: CommunityCreateViewProps) {
  const m = useMessages();
  const locale = useLocale();
  const choices = [
    { value: "public" as const, label: m.community.type.public },
    { value: "private" as const, label: m.community.type.private },
  ];
  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <ScreenHeader
          nav="close"
          fallback={COMMUNITIES_PATH}
          title={m.community.create.title}
        />
        <Text size="meta" tone="muted">
          {m.community.create.description}
        </Text>
      </View>
      {props.formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.formError}
        </Text>
      ) : null}
      <TextField
        label={m.mobileCommunity.create.nameLabel}
        value={props.name}
        onChangeText={props.onNameChange}
        error={props.nameError ?? undefined}
        maxLength={255}
        editable={!props.pending}
        returnKeyType="done"
      />
      <View style={{ gap: 6 }}>
        <Text weight="medium">{m.mobileCommunity.create.typeLabel}</Text>
        <ChoiceRow
          label={m.mobileCommunity.create.typeLabel}
          choices={choices}
          value={props.type}
          onSelect={props.onTypeChange}
          disabled={props.pending}
        />
        <Text size="meta" tone="muted">
          {communityTypeHelp(props.type, locale)}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text weight="medium">{m.community.sports.createLabel}</Text>
        <SportToggleRow
          value={props.sports}
          onToggle={props.onToggleSport}
          disabled={props.pending}
        />
        <Text size="meta" tone="muted">
          {m.community.sports.createHelp}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={m.community.create.submit}
          pending={props.pending}
          disabled={props.sports.length === 0}
          onPress={props.onSubmit}
        />
        <Button
          label={m.common.cancel}
          variant="outline"
          disabled={props.pending}
          onPress={props.onCancel}
        />
      </View>
    </View>
  );
}
