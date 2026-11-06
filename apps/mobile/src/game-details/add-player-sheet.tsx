import {
  ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
  ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  ADD_PLAYER_DEFAULT_LEVEL,
  addPlayerAddedToast,
  addPlayerCanSubmit,
  addPlayerCompletePhone,
  addPlayerFootballInput,
  addPlayerFootballPositionChoices,
  addPlayerFootballRoleChoices,
  addPlayerPreviewLine,
  addPlayerSeatChoices,
  addPlayerSideChoices,
  sameJoinSeat,
  type AddPlayerFootballPosition,
  type AddPlayerLevel,
  type AddPlayerPlacement,
} from "@repo/domain/add-player-by-phone";
import {
  groupAddActionLabel,
  groupAddedToast,
  groupMemberFootballDefaults,
  groupMemberRows,
  groupNoMatchLine,
  groupPickedNames,
  groupSpotsLine,
  toggleGroupMemberPick,
  type AddPlayerMode,
  type GroupMemberFootballPick,
} from "@repo/domain/add-player-from-group";
import type { FootballRole } from "@repo/domain/football-lineup";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { TileChoices } from "../auth/onboarding-choices";
import { FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { AddPlayerModeSwitch, GroupMemberList } from "./add-player-group-list";
import {
  AddPlayerIdentityFields,
  AddPlayerSection,
} from "./add-player-identity-fields";

function seatKey(seat: FriendlyGameJoinSeat) {
  return `${seat.sideIndex}:${seat.position}`;
}

type NamedSeat = { name: string } | null;

export function AddPlayerSheet({
  visible,
  onClose,
  gameId,
  placement,
  sides,
  initialSeat = null,
  groupName,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  placement: AddPlayerPlacement;
  sides: readonly { sideIndex: number; left: NamedSeat; right: NamedSeat }[];
  /** The open spot the Organizer tapped on the court. */
  initialSeat?: FriendlyGameJoinSeat | null;
  /** The Game's Group; with one, the sheet opens on its members. */
  groupName: string | null;
  onAdded: () => Promise<unknown>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState<AddPlayerLevel>(ADD_PLAYER_DEFAULT_LEVEL);
  const [footballLevel, setFootballLevel] = useState<FootballSelfPlacement>(
    ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  );
  const [role, setRole] = useState<FootballRole>(
    ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  );
  const [footballPosition, setFootballPosition] =
    useState<AddPlayerFootballPosition>(ADD_PLAYER_DEFAULT_FOOTBALL_POSITION);
  const [picked, setPicked] = useState<FriendlyGameJoinSeat | null>(null);
  const [pickedSide, setPickedSide] = useState<number | null>(null);
  const hasGroup = groupName != null;
  const [mode, setMode] = useState<AddPlayerMode>(hasGroup ? "group" : "phone");
  const [query, setQuery] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [footballPicks, setFootballPicks] = useState<
    Record<string, GroupMemberFootballPick>
  >({});

  useEffect(() => {
    if (visible) {
      setPicked(initialSeat);
      setMode(hasGroup ? "group" : "phone");
      setQuery("");
      setMemberIds([]);
      setFootballPicks({});
    }
  }, [visible, initialSeat, hasGroup]);

  const isFootball = placement === "football";
  const inGroupMode = hasGroup && mode === "group";
  const seatChoices =
    placement === "seat" ? addPlayerSeatChoices(sides, locale) : [];
  const seat =
    seatChoices.find((choice) => sameJoinSeat(choice.seat, picked))?.seat ??
    seatChoices[0]?.seat ??
    null;
  const sideChoices =
    placement === "side" ? addPlayerSideChoices(sides, locale) : [];
  const side =
    sideChoices.find((choice) => choice.sideIndex === pickedSide) ??
    sideChoices[0] ??
    null;
  const placed =
    placement === "seat"
      ? seat != null
      : placement === "side"
        ? side != null
        : true;
  const completePhone = addPlayerCompletePhone(countryIso, national);
  const preview = api.games.previewPlayerByPhone.useQuery(
    { gameId, countryIso, nationalNumber: national },
    { enabled: visible && completePhone != null, retry: false },
  );
  const previewData = completePhone ? (preview.data ?? null) : null;
  const isNew = previewData?.kind === "new";

  const add = api.games.addPlayerByPhone.useMutation({
    onSuccess: async (result) => {
      toast.show(addPlayerAddedToast(result.name, locale));
      setNational("");
      setName("");
      setLevel(ADD_PLAYER_DEFAULT_LEVEL);
      setFootballLevel(ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL);
      setRole(ADD_PLAYER_DEFAULT_FOOTBALL_ROLE);
      setFootballPosition(ADD_PLAYER_DEFAULT_FOOTBALL_POSITION);
      setPicked(null);
      await Promise.all([
        utils.games.previewPlayerByPhone.invalidate({ gameId }),
        onAdded(),
      ]);
    },
  });

  const groupMembers = api.games.listGroupMembersToAdd.useQuery(
    { gameId },
    { enabled: visible && hasGroup },
  );
  const roster = groupMembers.data ?? null;
  const openSpots = roster?.openSpots ?? 0;
  const memberRows = roster
    ? groupMemberRows(
        {
          members: roster.members,
          query,
          picked: memberIds,
          openSpots,
          isFootball,
        },
        locale,
      )
    : [];

  const addMembers = api.games.addGroupMembers.useMutation({
    onSuccess: async (result) => {
      toast.show(groupAddedToast(result.added, locale));
      setMemberIds([]);
      setFootballPicks({});
      setPicked(null);
      await Promise.all([
        utils.games.listGroupMembersToAdd.invalidate({ gameId }),
        utils.games.previewPlayerByPhone.invalidate({ gameId }),
        onAdded(),
      ]);
    },
  });

  function toggleMember(userId: string) {
    const next = toggleGroupMemberPick(memberIds, userId, openSpots);
    setMemberIds(next);
    const member = roster?.members.find((entry) => entry.userId === userId);
    if (next.includes(userId) && member && !footballPicks[userId]) {
      setFootballPicks((current) => ({
        ...current,
        [userId]: groupMemberFootballDefaults(member),
      }));
    }
  }

  function submitMembers() {
    if (memberIds.length === 0 || addMembers.isPending) {
      return;
    }
    addMembers.mutate({
      gameId,
      players: memberIds.map((userId) => {
        const pick = footballPicks[userId];
        return {
          userId,
          football:
            isFootball && pick
              ? addPlayerFootballInput(pick.role, pick.position)
              : undefined,
        };
      }),
      seat: placement === "seat" ? (picked ?? undefined) : undefined,
    });
  }

  const pending = add.isPending || addMembers.isPending;
  const canSubmit =
    !pending && addPlayerCanSubmit({ preview: previewData, name, placed });

  function submit() {
    if (!canSubmit) {
      return;
    }
    add.mutate({
      gameId,
      countryIso,
      nationalNumber: national,
      name: isNew ? name.trim() : undefined,
      level: isNew ? (isFootball ? footballLevel : level) : undefined,
      seat: seat ?? undefined,
      side: side ? { sideIndex: side.sideIndex } : undefined,
      football: isFootball
        ? addPlayerFootballInput(role, footballPosition)
        : undefined,
    });
  }

  function close() {
    add.reset();
    addMembers.reset();
    onClose();
  }

  const pickedNames = roster
    ? groupPickedNames(roster.members, memberIds, locale)
    : "";
  const groupFooter = (
    <View style={{ gap: 8 }}>
      <FieldError message={addMembers.error?.message} />
      {pickedNames ? (
        <Text size="meta" tone="muted" numberOfLines={1}>
          {pickedNames}
        </Text>
      ) : null}
      <Button
        label={groupAddActionLabel(memberIds.length, locale)}
        size="lg"
        pending={addMembers.isPending}
        disabled={memberIds.length === 0 || pending}
        onPress={submitMembers}
      />
    </View>
  );

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={m.group.addPlayer.action}
      subtitle={
        inGroupMode
          ? m.group.addPlayer.fromGroup.description
          : m.group.addPlayer.description
      }
      tall
      keyboardShouldPersistTaps="handled"
      footer={
        inGroupMode ? (
          groupFooter
        ) : (
          <View style={{ gap: 8 }}>
            <FieldError message={add.error?.message} />
            <Button
              label={m.group.addPlayer.addToGame}
              size="lg"
              pending={add.isPending}
              disabled={!canSubmit}
              onPress={submit}
            />
          </View>
        )
      }
    >
      {hasGroup ? <AddPlayerModeSwitch mode={mode} onChange={setMode} /> : null}
      {inGroupMode ? (
        <GroupMemberList
          query={query}
          onQueryChange={setQuery}
          groupLine={
            roster
              ? m.group.addPlayer.fromGroup.groupLine(
                  roster.groupName,
                  roster.members.length,
                )
              : null
          }
          spotsLine={
            roster ? groupSpotsLine(openSpots, memberIds.length, locale) : null
          }
          full={roster != null && memberIds.length >= openSpots}
          rows={memberRows}
          detailsById={
            new Map(
              (roster?.members ?? []).map((member) => [
                member.userId,
                { unclaimed: member.unclaimed, image: member.image },
              ]),
            )
          }
          footballById={isFootball ? footballPicks : null}
          emptyLine={
            roster && memberRows.length === 0 && query.trim()
              ? groupNoMatchLine(query, locale)
              : null
          }
          loading={groupMembers.isPending}
          error={groupMembers.error?.message}
          onToggle={toggleMember}
          onFootballChange={(userId, pick) =>
            setFootballPicks((current) => ({ ...current, [userId]: pick }))
          }
          disabled={addMembers.isPending}
        />
      ) : (
        <>
          <AddPlayerIdentityFields
            countryIso={countryIso}
            national={national}
            onCountryIsoChange={setCountryIso}
            onNationalChange={setNational}
            complete={completePhone != null}
            preview={
              previewData
                ? {
                    line: addPlayerPreviewLine(previewData, locale),
                    kind: previewData.kind,
                    phoneMasked: previewData.phoneMasked,
                  }
                : null
            }
            previewError={preview.error?.message}
            previewFetching={preview.isFetching}
            name={name}
            onNameChange={setName}
            isFootball={isFootball}
            level={level}
            onLevelChange={setLevel}
            footballLevel={footballLevel}
            onFootballLevelChange={setFootballLevel}
            disabled={add.isPending}
          />

          {isFootball ? (
            <>
              <AddPlayerSection label={m.mobileGameDetails.addPlayer.playsAs}>
                <TileChoices
                  label={m.mobileGameDetails.addPlayer.playsAs}
                  choices={addPlayerFootballRoleChoices(locale)}
                  value={role}
                  onSelect={setRole}
                  disabled={add.isPending}
                />
              </AddPlayerSection>
              {role === "outfield" ? (
                <AddPlayerSection
                  label={m.mobileGameDetails.addPlayer.preferredPosition}
                >
                  <TileChoices
                    label={m.mobileGameDetails.addPlayer.preferredPosition}
                    choices={addPlayerFootballPositionChoices(locale)}
                    value={footballPosition}
                    onSelect={setFootballPosition}
                    disabled={add.isPending}
                  />
                </AddPlayerSection>
              ) : null}
            </>
          ) : null}

          {placement === "side" ? (
            <AddPlayerSection label={m.mobileGameDetails.addPlayer.side}>
              {side ? (
                <TileChoices
                  label={m.mobileGameDetails.addPlayer.side}
                  choices={sideChoices.map((choice) => ({
                    value: String(choice.sideIndex),
                    name: choice.team,
                    detail: choice.detail,
                  }))}
                  value={String(side.sideIndex)}
                  onSelect={(key) => setPickedSide(Number(key))}
                  disabled={add.isPending}
                />
              ) : (
                <Text size="meta" tone="muted">
                  {m.group.addPlayer.noSide}
                </Text>
              )}
            </AddPlayerSection>
          ) : null}

          {placement === "seat" ? (
            <AddPlayerSection label={m.mobileGameDetails.addPlayer.position}>
              {seat ? (
                <TileChoices
                  label={m.mobileGameDetails.addPlayer.position}
                  choices={seatChoices.map((choice) => ({
                    value: seatKey(choice.seat),
                    name: choice.side,
                    detail: choice.team,
                  }))}
                  value={seatKey(seat)}
                  onSelect={(key) =>
                    setPicked(
                      seatChoices.find((choice) => seatKey(choice.seat) === key)
                        ?.seat ?? null,
                    )
                  }
                  disabled={add.isPending}
                />
              ) : (
                <Text size="meta" tone="muted">
                  {m.group.addPlayer.noSeat}
                </Text>
              )}
            </AddPlayerSection>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
