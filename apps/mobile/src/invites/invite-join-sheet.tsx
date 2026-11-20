import { spacing } from "@repo/design-tokens";
import {
  keeperNote,
  keeperSub,
  keepersIn,
  type JoinPlayer,
} from "@repo/domain/football-board";
import {
  footballPositionChoices,
  keeperSeatsLeft,
  keeperSeatsLine,
  positionCountsLine,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  gameInviteJoinSheetCopy,
  inviteJoinDoor,
  invitePreferredSide,
  type InviteJoinSheetInput,
  type InviteSeatPick,
  type SeatSideChoice,
} from "@repo/domain/game-invite-join-sheet";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Choice, Label } from "../football/join-sheet";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { SwitchRow } from "../profile-settings/settings-rows";

export type InviteJoinChoice = {
  seat: InviteSeatPick | null;
  football: { role: FootballRole; position: FootballPosition } | null;
  joinGroup: boolean;
  /** An alone sign-up's side; none is Either. */
  preferredSide?: "left" | "right";
};

/**
 * The one join sheet of a Game link (design 3d, 3f): team and side on padel,
 * role and position on football, the Group as a switch, and a button that
 * names the result.
 */
export function InviteJoinSheet({
  visible,
  onClose,
  input,
  football,
  pending,
  error,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  input: InviteJoinSheetInput;
  football: {
    players: readonly JoinPlayer[];
    preferred: { role: FootballRole | null; position: FootballPosition | null };
  } | null;
  pending: boolean;
  error: string | null;
  onSubmit: (choice: InviteJoinChoice) => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.join;
  const copy = gameInviteJoinSheetCopy(input);
  const firstOpenTeam =
    copy.teams.find((team) => !team.full)?.sideIndex ?? null;
  const [sideIndex, setSideIndex] = useState<number | null>(
    input.picked?.sideIndex ?? firstOpenTeam,
  );
  const [side, setSide] = useState<SeatSideChoice>(
    input.picked?.position ?? input.usualSide ?? "either",
  );
  const [joinGroup, setJoinGroup] = useState(true);
  const others = football?.players.filter((player) => !player.isViewer) ?? [];
  const keeperLocked = keeperSeatsLeft(keepersIn(others)) === 0;
  const [role, setRole] = useState<FootballRole>(
    football?.preferred.role ?? "outfield",
  );
  const [position, setPosition] = useState<FootballPosition>(
    football?.preferred.position ?? "mid",
  );
  const pickedSide = input.picked?.sideIndex ?? null;
  const pickedPosition = input.picked?.position ?? null;

  useEffect(() => {
    if (visible) {
      setSideIndex(pickedSide ?? firstOpenTeam);
      setSide(pickedPosition ?? input.usualSide ?? "either");
      setJoinGroup(true);
      setRole(football?.preferred.role ?? "outfield");
      setPosition(football?.preferred.position ?? "mid");
    }
    // Reset when the sheet opens, from the seat that was tapped.
  }, [visible, pickedSide, pickedPosition]);

  const chosenRole = keeperLocked ? "outfield" : role;
  const team =
    copy.teams.find((entry) => entry.sideIndex === sideIndex) ?? null;
  const groupOn = copy.groupToggle?.locked ? true : joinGroup;
  // Only a seat taken now keeps a side; a hold or a Level request has none.
  const showSide =
    copy.showsSide &&
    (!copy.alone ||
      inviteJoinDoor({
        gate: input.gate,
        joinGroup: groupOn,
        levelBlocked: input.levelBlocked,
      }) === "accept");
  const choice: InviteJoinChoice =
    input.kind === "football"
      ? {
          seat: null,
          football: { role: chosenRole, position },
          joinGroup: groupOn,
        }
      : {
          seat: team ? { sideIndex: team.sideIndex, position: side } : null,
          football: null,
          joinGroup: groupOn,
          preferredSide:
            copy.alone && showSide ? invitePreferredSide(side) : undefined,
        };
  const ready = input.kind === "football" || copy.alone || choice.seat != null;
  const sideNote = team ? copy.sideNote(team, side) : null;
  // A Social has many Game teams: two a row, so each stays readable.
  const teamRows = copy.teams.reduce<(typeof copy.teams)[]>(
    (rows, entry, index) => {
      if (index % 2 === 0) {
        rows.push([entry]);
      } else {
        rows[rows.length - 1]?.push(entry);
      }
      return rows;
    },
    [],
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      tall
      title={copy.title}
      subtitle={copy.lead}
      footer={
        <View style={{ gap: 8 }}>
          {error ? (
            <Text size="meta" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button
            label={copy.cta(choice)}
            size="lg"
            pending={pending}
            disabled={!ready}
            onPress={() => onSubmit(choice)}
          />
        </View>
      }
    >
      {input.kind === "padel" ? (
        <>
          {copy.alone ? null : (
            <View style={{ gap: 10 }}>
              <Label left={copy.teamLabel} />
              <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                {teamRows.map((row) => (
                  <View
                    key={row[0]?.sideIndex}
                    style={{ flexDirection: "row", gap: 8 }}
                  >
                    {row.map((entry) => (
                      <Choice
                        key={entry.sideIndex}
                        title={entry.label}
                        note={entry.meta}
                        selected={sideIndex === entry.sideIndex}
                        locked={entry.full}
                        onPress={() => setSideIndex(entry.sideIndex)}
                      />
                    ))}
                    {row.length < 2 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </View>
            </View>
          )}
          {showSide ? (
            <View style={{ gap: 10 }}>
              <Label left={copy.sideLabel} right={copy.sideHint} />
              <View
                accessibilityRole="radiogroup"
                style={{ flexDirection: "row", gap: 8 }}
              >
                {copy.sideOptions.map((option) => (
                  <Choice
                    key={option.value}
                    title={option.label}
                    note=""
                    selected={side === option.value}
                    onPress={() => setSide(option.value)}
                  />
                ))}
              </View>
              {sideNote ? (
                <Text size="meta" tone="muted">
                  {sideNote}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <>
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
              <Label
                left={m.preferredPosition}
                right={m.preferenceNotPromise}
              />
              <View
                accessibilityRole="radiogroup"
                style={{ flexDirection: "row", gap: 8 }}
              >
                {footballPositionChoices(locale).map((option) => (
                  <Choice
                    key={option.value}
                    title={option.code}
                    note={option.label}
                    selected={position === option.value}
                    onPress={() => setPosition(option.value)}
                  />
                ))}
              </View>
              <Text size="meta" tone="muted">
                {positionCountsLine(others, locale)}
              </Text>
            </View>
          ) : null}
        </>
      )}
      {copy.groupToggle ? (
        <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
          <SwitchRow
            title={copy.groupToggle.label}
            sub={copy.groupToggle.policy}
            value={groupOn}
            disabled={copy.groupToggle.locked || pending}
            onChange={setJoinGroup}
          />
          <Text
            size="eyebrow"
            tone="muted"
            style={{
              paddingHorizontal: spacing.surface,
              paddingBottom: spacing.compact,
            }}
          >
            {copy.groupToggle.note}
          </Text>
        </Surface>
      ) : null}
      {copy.levelNote ? (
        <Text size="meta" tone="muted">
          {copy.levelNote}
        </Text>
      ) : null}
    </Sheet>
  );
}
