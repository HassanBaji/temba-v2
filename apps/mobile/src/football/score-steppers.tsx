import { radii } from "@repo/design-tokens";
import {
  sideOvrAverage,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { Minus, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { BibChip } from "./bib-picker";

const STEP = 44;

function StepButton({
  kind,
  label,
  onPress,
}: {
  kind: "down" | "up";
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const up = kind === "up";
  const Icon = up ? Plus : Minus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: STEP,
        height: STEP,
        borderRadius: radii.md,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: up ? colors.control : colors.paper,
        borderWidth: hairline,
        borderColor: up ? colors.controlEdge : colors.inputBorder,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon size={18} color={up ? colors.onControl : colors.ink} />
    </Pressable>
  );
}

/** One side's goals with minus and plus under them. */
export function SideStepper({
  bib,
  name,
  goals,
  members,
  onStep,
}: {
  bib: Bibs["slot1"];
  name: string;
  goals: number;
  members: readonly BoardPlayer[];
  onStep: (delta: -1 | 1) => void;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const m = messages.mobileTournament.scoreScreen;
  return (
    <View
      style={{ flex: 1, alignItems: "center", gap: 10, paddingVertical: 18 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BibChip bib={bib} size={14} />
        <Text size="meta" weight="semibold">
          {name}
        </Text>
      </View>
      <Text
        size="heroTime"
        width="expanded"
        weight="bold"
        accessibilityLabel={m.teamGoalsSr(name, goals)}
      >
        {String(goals)}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <StepButton
          kind="down"
          label={m.oneGoalFewer(name)}
          onPress={() => onStep(-1)}
        />
        <StepButton
          kind="up"
          label={m.oneGoalMore(name)}
          onPress={() => onStep(1)}
        />
      </View>
      <Text size="meta" tone="muted">
        {messages.game.played.avg(sideOvrAverage(members, locale))}
      </Text>
    </View>
  );
}
