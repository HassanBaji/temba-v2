import { spacing } from "@repo/design-tokens";
import { friendlyGameCtaCopy } from "@repo/domain/friendly-game-actions";
import type { FriendlyGameCtaFamily } from "@repo/domain/friendly-game-cta";
import type {
  ScoreReviewActionKind,
  ScoreReviewBar as ScoreReviewBarModel,
} from "@repo/domain/score-review";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocale } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";

export type BottomBarHandlers = {
  joinPending: boolean;
  leaveWaitlistPending: boolean;
  onJoin: () => void;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
  onBrowse: () => void;
};

export type BottomBarLines = { title: string; subline: string | null };

export function BottomBar({
  family,
  handlers,
  lines = null,
  inset = true,
}: {
  family: FriendlyGameCtaFamily;
  handlers: BottomBarHandlers;
  /** Replaces the family's own title and subline. */
  lines?: BottomBarLines | null;
  inset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const locale = useLocale();
  const familyCopy = friendlyGameCtaCopy(family, locale);

  if (!familyCopy) {
    return null;
  }
  const copy = lines ? { ...familyCopy, ...lines } : familyCopy;

  const action = (() => {
    switch (family.kind) {
      case "browse":
        return { onPress: handlers.onBrowse, pending: false };
      case "join_waitlist":
        return {
          onPress: handlers.onJoinWaitlist,
          pending: handlers.joinPending,
        };
      case "join":
        return { onPress: handlers.onJoin, pending: handlers.joinPending };
      case "waitlisted":
        return {
          onPress: handlers.onLeaveWaitlist,
          pending: handlers.leaveWaitlistPending,
        };
      default:
        return null;
    }
  })();
  const fullWidth = copy.title == null;

  return (
    <View>
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: spacing.surface,
          paddingTop: 12,
          paddingBottom: (inset ? insets.bottom : 0) + 12,
        }}
      >
        {copy.title ? (
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="body" weight="semibold">
              {copy.title}
            </Text>
            {copy.subline ? (
              <Text size="meta" tone="muted">
                {copy.subline}
              </Text>
            ) : null}
          </View>
        ) : null}
        {copy.actionLabel && action ? (
          <View style={fullWidth ? { flex: 1 } : undefined}>
            <Button
              label={copy.actionLabel}
              variant={family.kind === "waitlisted" ? "outline" : "default"}
              pending={action.pending}
              onPress={action.onPress}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The bar once a padel score is in: who entered it and what it means for
 * the viewer, over the two actions (ADR-0114).
 */
export function ScoreReviewBar({
  bar,
  pending,
  onAction,
  inset = true,
}: {
  bar: ScoreReviewBarModel;
  pending: boolean;
  onAction: (kind: ScoreReviewActionKind) => void;
  inset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View>
      <Hairline />
      <View
        style={{
          gap: 12,
          paddingHorizontal: spacing.surface,
          paddingTop: 12,
          paddingBottom: (inset ? insets.bottom : 0) + 12,
        }}
      >
        <View>
          <Text size="body" weight="semibold">
            {bar.title}
          </Text>
          {bar.subline ? (
            <Text size="meta" tone="muted">
              {bar.subline}
            </Text>
          ) : null}
        </View>
        {bar.actions.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {bar.actions.map((action) => (
              <View key={action.kind} style={{ flex: 1 }}>
                <Button
                  label={action.label}
                  variant={action.primary ? "default" : "outline"}
                  pending={pending && action.primary}
                  disabled={!action.enabled || (pending && !action.primary)}
                  onPress={() => onAction(action.kind)}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
