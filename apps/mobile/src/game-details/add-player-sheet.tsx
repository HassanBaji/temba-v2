import {
  ADD_PLAYER_ACTION,
  ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
  ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  ADD_PLAYER_DEFAULT_LEVEL,
  ADD_PLAYER_DESCRIPTION,
  ADD_PLAYER_FOOTBALL_POSITION_CHOICES,
  ADD_PLAYER_FOOTBALL_ROLE_CHOICES,
  ADD_PLAYER_NO_SEAT_COPY,
  ADD_PLAYER_NO_SIDE_COPY,
  addPlayerAddedToast,
  addPlayerCanSubmit,
  addPlayerCompletePhone,
  addPlayerFootballInput,
  addPlayerPreviewLine,
  addPlayerSeatChoices,
  addPlayerSideChoices,
  sameJoinSeat,
  type AddPlayerFootballPosition,
  type AddPlayerLevel,
  type AddPlayerPlacement,
} from "@repo/domain/add-player-by-phone";
import type { FootballRole } from "@repo/domain/football-lineup";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { useState } from "react";
import { View } from "react-native";

import { TileChoices } from "../auth/onboarding-choices";
import { FieldError } from "../create-game/chips";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
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
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  placement: AddPlayerPlacement;
  sides: readonly { sideIndex: number; left: NamedSeat; right: NamedSeat }[];
  onAdded: () => Promise<unknown>;
}) {
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

  const isFootball = placement === "football";
  const seatChoices = placement === "seat" ? addPlayerSeatChoices(sides) : [];
  const seat =
    seatChoices.find((choice) => sameJoinSeat(choice.seat, picked))?.seat ??
    seatChoices[0]?.seat ??
    null;
  const sideChoices = placement === "side" ? addPlayerSideChoices(sides) : [];
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
      toast.show(addPlayerAddedToast(result.name));
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

  const canSubmit =
    !add.isPending &&
    addPlayerCanSubmit({ preview: previewData, name, placed });

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
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={ADD_PLAYER_ACTION}
      subtitle={ADD_PLAYER_DESCRIPTION}
      tall
      keyboardShouldPersistTaps="handled"
      footer={
        <View style={{ gap: 8 }}>
          <FieldError message={add.error?.message} />
          <Button
            label={ADD_PLAYER_ACTION}
            size="lg"
            pending={add.isPending}
            disabled={!canSubmit}
            onPress={submit}
          />
        </View>
      }
    >
      <AddPlayerIdentityFields
        countryIso={countryIso}
        national={national}
        onCountryIsoChange={setCountryIso}
        onNationalChange={setNational}
        complete={completePhone != null}
        preview={
          previewData
            ? {
                line: addPlayerPreviewLine(previewData),
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
          <AddPlayerSection label="Plays as">
            <TileChoices
              label="Plays as"
              choices={ADD_PLAYER_FOOTBALL_ROLE_CHOICES}
              value={role}
              onSelect={setRole}
              disabled={add.isPending}
            />
          </AddPlayerSection>
          {role === "outfield" ? (
            <AddPlayerSection label="Preferred position">
              <TileChoices
                label="Preferred position"
                choices={ADD_PLAYER_FOOTBALL_POSITION_CHOICES}
                value={footballPosition}
                onSelect={setFootballPosition}
                disabled={add.isPending}
              />
            </AddPlayerSection>
          ) : null}
        </>
      ) : null}

      {placement === "side" ? (
        <AddPlayerSection label="Side">
          {side ? (
            <TileChoices
              label="Side"
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
              {ADD_PLAYER_NO_SIDE_COPY}
            </Text>
          )}
        </AddPlayerSection>
      ) : null}

      {placement === "seat" ? (
        <AddPlayerSection label="Position">
          {seat ? (
            <TileChoices
              label="Position"
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
              {ADD_PLAYER_NO_SEAT_COPY}
            </Text>
          )}
        </AddPlayerSection>
      ) : null}
    </Sheet>
  );
}
