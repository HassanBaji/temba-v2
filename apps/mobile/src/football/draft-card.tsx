import { radii } from "@repo/design-tokens";
import {
  footballDraftSavedLine,
  footballDraftSummary,
} from "@repo/domain/football-draft";
import { Pencil } from "lucide-react-native";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { RouterOutputs } from "../trpc/react";

type SavedDraft = NonNullable<RouterOutputs["games"]["footballBoard"]["draft"]>;

function DraftTag({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: colors.ink,
        borderRadius: radii.slot,
        paddingVertical: 3,
        paddingHorizontal: 6,
      }}
    >
      <Text size="eyebrow" mono uppercase style={{ letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The Organizer's Draft line-up on the Game screen (ADR-0107): when it was
 * saved, whether it can be published as it stands, then Publish teams and
 * Edit draft.
 */
export function DraftCard({
  draft,
  rosterUserIds,
  publishPending,
  onPublish,
  onEdit,
}: {
  draft: SavedDraft;
  rosterUserIds: readonly string[];
  publishPending: boolean;
  onPublish: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.draft;
  const copy = messages.mobileGameDetails.football;
  const summary = footballDraftSummary(
    { ...draft.sides, bibs: draft.bibs },
    rosterUserIds,
    locale,
  );
  return (
    <View style={{ gap: 12 }}>
      <Surface style={{ gap: 8, borderColor: colors.ink }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <DraftTag label={m.tag} />
          <Text
            weight="semibold"
            accessibilityRole="header"
            style={{ flex: 1 }}
          >
            {m.title}
          </Text>
          <Text size="meta" tone="muted">
            {footballDraftSavedLine(draft.savedAt, locale)}
          </Text>
        </View>
        <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
          {summary.line}
        </Text>
      </Surface>
      <Button
        label={copy.publishTeams}
        size="lg"
        disabled={!summary.canPublish}
        pending={publishPending}
        onPress={onPublish}
      />
      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          <Button
            label={copy.editDraft}
            variant="outline"
            icon={<Pencil size={15} color={colors.ink} />}
            onPress={onEdit}
          />
        </View>
      </View>
    </View>
  );
}
