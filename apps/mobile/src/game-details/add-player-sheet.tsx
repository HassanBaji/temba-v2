import {
  ADD_PLAYER_ACTION,
  ADD_PLAYER_DEFAULT_LEVEL,
  ADD_PLAYER_DESCRIPTION,
  ADD_PLAYER_LEVEL_CHOICES,
  ADD_PLAYER_NAME_LABEL,
  ADD_PLAYER_NO_SEAT_COPY,
  addPlayerAddedToast,
  addPlayerCanSubmit,
  addPlayerCompletePhone,
  addPlayerPreviewLine,
  addPlayerSeatChoices,
  sameJoinSeat,
  type AddPlayerLevel,
} from "@repo/domain/add-player-by-phone";
import type { FriendlyGameDetailsSide } from "@repo/domain/friendly-game-details";
import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { useState } from "react";
import { View } from "react-native";

import { RowChoices, TileChoices } from "../auth/onboarding-choices";
import { PhoneField } from "../auth/phone-field";
import { FieldError } from "../create-game/chips";
import { Button } from "../primitives/button";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

function seatKey(seat: FriendlyGameJoinSeat) {
  return `${seat.sideIndex}:${seat.position}`;
}

export function AddPlayerSheet({
  visible,
  onClose,
  gameId,
  sides,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  sides: readonly FriendlyGameDetailsSide[];
  onAdded: () => Promise<unknown>;
}) {
  const toast = useToast();
  const utils = api.useUtils();
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState<AddPlayerLevel>(ADD_PLAYER_DEFAULT_LEVEL);
  const [picked, setPicked] = useState<FriendlyGameJoinSeat | null>(null);

  const seatChoices = addPlayerSeatChoices(sides);
  const seat =
    seatChoices.find((choice) => sameJoinSeat(choice.seat, picked))?.seat ??
    seatChoices[0]?.seat ??
    null;
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
      setPicked(null);
      await Promise.all([
        utils.games.previewPlayerByPhone.invalidate({ gameId }),
        onAdded(),
      ]);
    },
  });

  const canSubmit =
    !add.isPending && addPlayerCanSubmit({ preview: previewData, name, seat });

  function submit() {
    if (!seat || !canSubmit) {
      return;
    }
    add.mutate({
      gameId,
      countryIso,
      nationalNumber: national,
      name: isNew ? name.trim() : undefined,
      level: isNew ? level : undefined,
      seat,
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
      <View style={{ gap: 8 }}>
        <PhoneField
          label="Phone"
          countryIso={countryIso}
          national={national}
          onCountryIsoChange={setCountryIso}
          onNationalChange={setNational}
          error={completePhone ? preview.error?.message : undefined}
          disabled={add.isPending}
        />
        <View accessibilityLiveRegion="polite" style={{ gap: 6 }}>
          {previewData ? (
            <Text size="meta">{addPlayerPreviewLine(previewData)}</Text>
          ) : completePhone && preview.isFetching ? (
            <Text size="meta" tone="muted">
              Looking up…
            </Text>
          ) : null}
          {previewData?.kind === "unclaimed" ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <NotOnTembaMark />
              <Text size="meta" tone="muted">
                {previewData.phoneMasked}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {isNew ? (
        <>
          <TextField
            label={ADD_PLAYER_NAME_LABEL}
            value={name}
            maxLength={100}
            autoCapitalize="words"
            autoComplete="off"
            editable={!add.isPending}
            onChangeText={setName}
          />
          <View style={{ gap: 8 }}>
            <Text size="meta" tone="muted">
              Starting Level
            </Text>
            <RowChoices
              label="Starting Level"
              choices={ADD_PLAYER_LEVEL_CHOICES}
              value={level}
              onSelect={setLevel}
              disabled={add.isPending}
            />
          </View>
        </>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted">
          Position
        </Text>
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
      </View>
    </Sheet>
  );
}
