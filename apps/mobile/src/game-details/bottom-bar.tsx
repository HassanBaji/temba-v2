import { spacing } from "@repo/design-tokens";
import { friendlyGameCtaCopy } from "@repo/domain/friendly-game-actions";
import type { FriendlyGameCtaFamily } from "@repo/domain/friendly-game-cta";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export function BottomBar({
  family,
  handlers,
  inset = true,
}: {
  family: FriendlyGameCtaFamily;
  handlers: BottomBarHandlers;
  inset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const copy = friendlyGameCtaCopy(family);

  if (!copy) {
    return null;
  }

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
