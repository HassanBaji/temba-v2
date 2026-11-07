import { colors, radii, sizes } from "@repo/design-tokens";
import { ArrowUpRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { MarkCoin } from "./mark-coin";
import { mvpRowModel } from "./marks-model";
import type { GameMarksController } from "./use-game-marks";

const PROFILE_BUTTON = 36;

/**
 * The MVP inside the black hero: not decided yet with Vote or Pick while the
 * window is open (2a), then the MVP with how it was decided (2f). Outlined on
 * ink, so the hero stays the screen's one ink Surface.
 */
export function MvpRow({
  marks,
  onOpenPlayer,
}: {
  marks: GameMarksController;
  onOpenPlayer?: (userId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const model = marks.data ? mvpRowModel(marks.data, locale) : null;
  if (!model) {
    return null;
  }
  const { action, userId } = model;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.dimrule,
      }}
    >
      <MarkCoin
        kind="mvp"
        size="roster"
        state={model.state === "decided" ? "earned" : "notYet"}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="semibold">
          {model.title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {model.line}
        </Text>
      </View>
      {action ? (
        <Button
          label={action.label}
          size="sm"
          onPress={() => marks.openSheet({ kind: action.sheet })}
        />
      ) : userId && onOpenPlayer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.mobilePlayer.played.viewProfile}
          hitSlop={(sizes.touchTarget - PROFILE_BUTTON) / 2}
          onPress={() => onOpenPlayer(userId)}
          style={({ pressed }) => ({
            width: PROFILE_BUTTON,
            height: PROFILE_BUTTON,
            borderRadius: radii.md,
            borderWidth: hairline,
            borderColor: colors.dimrule,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowUpRight
            size={sizes.iconRow}
            color={colors.paper}
            style={mirrorInRtl}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
