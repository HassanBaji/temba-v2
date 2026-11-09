import { radii, spacing } from "@repo/design-tokens";
import {
  footballPositionChoices,
  keeperSeatsLeft,
  keeperSeatsLine,
  positionCountsLine,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Sheet } from "../primitives/sheet";
import { SurfaceToneContext } from "../primitives/surface-context";
import { tonePalette } from "../primitives/tone-palette";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
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

/** A pill-sized radio choice with a title and a note; shared with the Invite link join sheet. */
export function Choice({
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
  const m = useMessages().mobileTournament.join;
  const tone = selected ? "ink" : "paper";
  const colors = useColors();
  const palette = tonePalette(tone, colors);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={m.choiceSr(title, note)}
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
          backgroundColor: selected ? colors.control : palette.background,
          borderWidth: hairline,
          borderColor: selected ? colors.ink : palette.rule,
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

export function Label({ left, right }: { left: string; right?: string }) {
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
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.join;
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
      ? joinActionLabel(chosenRole, position, props.price, locale)
      : messages.common.save;

  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      tall
      title={props.mode === "join" ? m.joinThisGame : m.howYouPlay}
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
        <Label
          left={m.joinAs}
          right={keeperSeatsLine(keepersIn(others), locale)}
        />
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", gap: 8 }}
        >
          <Choice
            title={m.player}
            note={m.outfield}
            selected={chosenRole === "outfield"}
            onPress={() => setRole("outfield")}
          />
          <Choice
            title={m.keeper}
            note={keeperSub(others, locale)}
            selected={chosenRole === "keeper"}
            locked={keeperLocked}
            onPress={() => setRole("keeper")}
          />
        </View>
        <Text size="meta" tone="muted">
          {keeperNote(others, locale)}
        </Text>
      </View>

      {chosenRole === "outfield" ? (
        <View style={{ gap: 10 }}>
          <Label left={m.preferredPosition} right={m.preferenceNotPromise} />
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", gap: 8 }}
          >
            {footballPositionChoices(locale).map((choice) => (
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
            {positionCountsLine(others, locale)}
          </Text>
        </View>
      ) : null}

      <View style={{ paddingTop: spacing.compact / 2 }}>
        <InfoRows
          rows={[
            {
              label: m.yourSeat,
              value: seatSummary(chosenRole, position, locale),
            },
            ...(props.price
              ? [{ label: m.pitchCost, value: props.price }]
              : []),
            { label: messages.common.teams, value: props.teamsLine },
          ]}
        />
      </View>
    </Sheet>
  );
}
