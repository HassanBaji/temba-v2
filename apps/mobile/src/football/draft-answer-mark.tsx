import { radii } from "@repo/design-tokens";
import type { FootballDraftAnswerState } from "@repo/domain/football-draft";
import { Check, MessageSquare } from "lucide-react-native";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/**
 * A Captain's answer as a mark, as `ResultMark` reads: Approved solid with a
 * check, Change asked in outline, Waiting hatched for "not yet". A side with
 * nobody to ask has no mark.
 */
export function DraftAnswerMark({
  state,
  size = 20,
}: {
  state: FootballDraftAnswerState;
  size?: number;
}) {
  const colors = useColors();
  if (state === "none") {
    return null;
  }
  const box = {
    width: size,
    height: size,
    borderRadius: radii.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  if (state === "approved") {
    return (
      <View style={{ ...box, backgroundColor: colors.control }}>
        <Check size={size * 0.6} color={colors.onControl} />
      </View>
    );
  }
  if (state === "change_asked") {
    return (
      <View style={{ ...box, borderWidth: hairline, borderColor: colors.ink }}>
        <MessageSquare size={size * 0.55} color={colors.ink} />
      </View>
    );
  }
  return (
    <View style={box}>
      <Hatch radius={radii.sm} />
    </View>
  );
}

/** The mark and its word: "Approved", "Change asked", "Waiting", "nobody to ask". */
export function DraftAnswer({ state }: { state: FootballDraftAnswerState }) {
  const m = useMessages().football.draft.answer;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <DraftAnswerMark state={state} />
      <Text
        size="meta"
        weight={
          state === "approved" || state === "change_asked"
            ? "semibold"
            : "regular"
        }
        tone={state === "waiting" || state === "none" ? "muted" : undefined}
      >
        {m[state]}
      </Text>
    </View>
  );
}
