import { radii, spacing } from "@repo/design-tokens";
import {
  FOOTBALL_POSITION_CHOICES,
  keeperSeatsLeft,
  keeperSeatsLine,
  positionCountsLine,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Sheet } from "../primitives/sheet";
import { SurfaceToneContext } from "../primitives/surface-context";
import { tonePalette } from "../primitives/tone-palette";
import { Text } from "../primitives/text";
import { InfoRows } from "./info-rows";
import {
  joinActionLabel,
  keeperNote,
  keeperSub,
  keepersIn,
  seatSummary,
  type JoinPlayer,
} from "@repo/domain/football-board";

const CHOICE_HEIGHT = 52;

function Choice({
  title,
  note,
  selected,
  locked = false,
  onPress,
}: {
  title: string;
  note: string;
  selected: boolean;
  locked?: boolean;
  onPress: () => void;
}) {
  const tone = selected ? "ink" : "paper";
  const palette = tonePalette(tone);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={`${title}, ${note}`}
        accessibilityState={{ checked: selected, disabled: locked }}
        disabled={locked}
        onPress={onPress}
        style={{
          flex: 1,
          height: CHOICE_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          borderRadius: radii.lg,
          backgroundColor: palette.background,
          borderWidth: hairline,
          borderColor: selected ? palette.background : palette.rule,
        }}
      >
        {locked ? <Hatch radius={radii.lg} /> : null}
        <Text weight="semibold" tone={locked ? "muted" : "default"}>
          {title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {note}
        </Text>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

function Label({ left, right }: { left: string; right?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
      }}
    >
      <Text size="meta" tone="muted">
        {left}
      </Text>
      {right ? (
        <Text size="eyebrow" tone="muted">
          {right}
        </Text>
      ) : null}
    </View>
  );
}

export type FootballJoinSheetProps = {
  visible: boolean;
  mode: "join" | "edit";
  subtitle: string;
  players: readonly JoinPlayer[];
  viewer: { role: FootballRole | null; position: FootballPosition | null };
  price: string | null;
  teamsLine: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (role: FootballRole, position: FootballPosition) => void;
};

/**
 * Join as a player or a keeper and name the position you prefer. Keeper is
 * locked once both keeper seats are taken. The same sheet changes your
 * choice after joining.
 */
export function FootballJoinSheet(props: FootballJoinSheetProps) {
  const others = props.players.filter((player) => !player.isViewer);
  const alreadyKeeper = props.mode === "edit" && props.viewer.role === "keeper";
  const keeperLocked =
    keeperSeatsLeft(keepersIn(others)) === 0 && !alreadyKeeper;
  const [role, setRole] = useState<FootballRole>(
    props.viewer.role ?? "outfield",
  );
  const [position, setPosition] = useState<FootballPosition>(
    props.viewer.position ?? "mid",
  );

  useEffect(() => {
    if (props.visible) {
      setRole(props.viewer.role ?? "outfield");
      setPosition(props.viewer.position ?? "mid");
    }
  }, [props.visible, props.viewer.role, props.viewer.position]);

  const chosenRole = keeperLocked ? "outfield" : role;
  const action =
    props.mode === "join"
      ? joinActionLabel(chosenRole, position, props.price)
      : "Save";

  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      tall
      title={props.mode === "join" ? "Join this game" : "How you play"}
      subtitle={props.subtitle}
      footer={
        <View style={{ gap: 8 }}>
          {props.error ? (
            <Text size="meta" accessibilityRole="alert">
              {props.error}
            </Text>
          ) : null}
          <Button
            label={action}
            size="lg"
            pending={props.pending}
            onPress={() => props.onSubmit(chosenRole, position)}
          />
        </View>
      }
    >
      <View style={{ gap: 10 }}>
        <Label left="Join as" right={keeperSeatsLine(keepersIn(others))} />
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", gap: 8 }}
        >
          <Choice
            title="Player"
            note="outfield"
            selected={chosenRole === "outfield"}
            onPress={() => setRole("outfield")}
          />
          <Choice
            title="Keeper"
            note={keeperSub(others)}
            selected={chosenRole === "keeper"}
            locked={keeperLocked}
            onPress={() => setRole("keeper")}
          />
        </View>
        <Text size="meta" tone="muted">
          {keeperNote(others)}
        </Text>
      </View>

      {chosenRole === "outfield" ? (
        <View style={{ gap: 10 }}>
          <Label
            left="Preferred position"
            right="a preference, not a promise"
          />
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", gap: 8 }}
          >
            {FOOTBALL_POSITION_CHOICES.map((choice) => (
              <Choice
                key={choice.value}
                title={choice.code}
                note={choice.label}
                selected={position === choice.value}
                onPress={() => setPosition(choice.value)}
              />
            ))}
          </View>
          <Text size="meta" tone="muted">
            {positionCountsLine(others)}
          </Text>
        </View>
      ) : null}

      <View style={{ paddingTop: spacing.compact / 2 }}>
        <InfoRows
          rows={[
            { label: "Your seat", value: seatSummary(chosenRole, position) },
            ...(props.price
              ? [{ label: "Pitch cost", value: props.price }]
              : []),
            { label: "Teams", value: props.teamsLine },
          ]}
        />
      </View>
    </Sheet>
  );
}
