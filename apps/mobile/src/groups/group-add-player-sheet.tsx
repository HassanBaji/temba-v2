import {
  ADD_GROUP_PLAYER_DESCRIPTION,
  ADD_PLAYER_ACTION,
  ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  ADD_PLAYER_DEFAULT_LEVEL,
  addGroupPlayerCanSubmit,
  addGroupPlayerDoneToast,
  addGroupPlayerPreviewLine,
  addPlayerCompletePhone,
  type AddPlayerLevel,
} from "@repo/domain/add-player-by-phone";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { useState } from "react";
import { View } from "react-native";

import { FieldError } from "../create-game/chips";
import { AddPlayerIdentityFields } from "../game-details/add-player-identity-fields";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

export function GroupAddPlayerSheet({
  visible,
  onClose,
  groupId,
  isFootball,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  isFootball: boolean;
  onDone: () => Promise<unknown>;
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

  const completePhone = addPlayerCompletePhone(countryIso, national);
  const preview = api.groups.previewPlayerByPhone.useQuery(
    { groupId, countryIso, nationalNumber: national },
    { enabled: visible && completePhone != null, retry: false },
  );
  const previewData = completePhone ? (preview.data ?? null) : null;
  const isNew = previewData?.kind === "new";

  const add = api.groups.addPlayerByPhone.useMutation({
    onSuccess: async (result) => {
      toast.show(addGroupPlayerDoneToast(result));
      setNational("");
      setName("");
      setLevel(ADD_PLAYER_DEFAULT_LEVEL);
      setFootballLevel(ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL);
      await Promise.all([
        utils.groups.previewPlayerByPhone.invalidate({ groupId }),
        onDone(),
      ]);
    },
  });

  const canSubmit =
    !add.isPending && addGroupPlayerCanSubmit({ preview: previewData, name });

  function submit() {
    if (!canSubmit) {
      return;
    }
    add.mutate({
      groupId,
      countryIso,
      nationalNumber: national,
      name: isNew ? name.trim() : undefined,
      level: isNew ? (isFootball ? footballLevel : level) : undefined,
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
      subtitle={ADD_GROUP_PLAYER_DESCRIPTION}
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
                line: addGroupPlayerPreviewLine(previewData),
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
    </Sheet>
  );
}
