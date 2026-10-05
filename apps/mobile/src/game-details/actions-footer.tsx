import { sizes, spacing } from "@repo/design-tokens";
import type { FriendlyGameFooterAction } from "@repo/domain/friendly-game-actions";
import { Pressable, View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";

export function ActionsFooter({
  actions,
  pendingKind,
  onAction,
}: {
  actions: FriendlyGameFooterAction[];
  pendingKind: FriendlyGameFooterAction["kind"] | null;
  onAction: (kind: FriendlyGameFooterAction["kind"]) => void;
}) {
  if (actions.length === 0) {
    return null;
  }
  return (
    <View>
      {actions.map((action) => {
        const pending = pendingKind === action.kind;
        return (
          <View key={action.kind}>
            <Hairline />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                action.consequence
                  ? `${action.label}. ${action.consequence}`
                  : action.label
              }
              accessibilityState={{
                disabled: !action.enabled || pending,
                busy: pending,
              }}
              disabled={!action.enabled || pending}
              onPress={() => onAction(action.kind)}
              style={({ pressed }) => ({
                minHeight: sizes.touchTarget,
                justifyContent: "center",
                paddingVertical: 14,
                paddingHorizontal: spacing.surface / 2,
                opacity: !action.enabled || pending ? 0.5 : pressed ? 0.7 : 1,
              })}
            >
              <Text size="body" weight="medium">
                {action.label}
              </Text>
              {action.consequence ? (
                <Text size="meta" tone="muted">
                  {action.consequence}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
