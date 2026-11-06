import {
  groupCreateDoor,
  groupCreateRequiresApproval,
  type GroupCreateType,
} from "@repo/domain/group-create";
import { DEFAULT_SPORT, SPORTS, type Sport } from "@repo/domain/sport";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { GroupCreateFooter, GroupCreateView } from "./group-create-view";
import { groupPath } from "./groups-model";
import { pickGroupImage } from "./pick-group-image";
import type { PickedImage } from "./group-image";

type Picked = { uri: string; upload: PickedImage & { ok: true } };

export function GroupCreateScreen() {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupCreateType>("public");
  const [pickedSport, setPickedSport] = useState<Sport | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sport = pickedSport ?? DEFAULT_SPORT;

  const createLoosePublic = api.groups.createLoosePublic.useMutation();
  const createLoosePrivate = api.groups.createLoosePrivate.useMutation();
  const uploadImage = api.groups.uploadImage.useMutation();

  async function createGroup(trimmed: string) {
    const base = { name: trimmed, sport };
    if (groupCreateDoor(type) === "createLoosePrivate") {
      return createLoosePrivate.mutateAsync(base);
    }
    return createLoosePublic.mutateAsync({
      ...base,
      requiresApproval: groupCreateRequiresApproval(type, requiresApproval),
    });
  }

  async function refreshAfterCreate() {
    await Promise.all([
      utils.groups.mine.invalidate(),
      utils.users.home.invalidate(),
    ]);
  }

  async function submit() {
    const trimmed = name.trim();
    if (submitting || !trimmed) {
      return;
    }
    setNameError(null);
    setFormError(null);
    setSubmitting(true);
    let groupId: string;
    try {
      groupId = (await createGroup(trimmed)).id;
    } catch (error) {
      const failure = error as {
        message: string;
        data?: { zodError?: unknown } | null;
      };
      const split = splitTrpcFormError(failure);
      setNameError(split.fieldErrors.name ?? null);
      setFormError(
        split.globalMessage ??
          (split.fieldErrors.name ? null : failure.message),
      );
      toast.show(
        split.globalMessage ?? split.fieldErrors.name ?? failure.message,
      );
      setSubmitting(false);
      return;
    }
    let message = m.group.create.createdToast;
    if (picked) {
      try {
        await uploadImage.mutateAsync({
          groupId,
          contentType: picked.upload.contentType,
          dataBase64: picked.upload.dataBase64,
        });
      } catch {
        message = m.createGame.image.groupCreatedWithoutImage;
      }
    }
    toast.show(message);
    await refreshAfterCreate();
    setSubmitting(false);
    router.replace(groupPath(groupId));
  }

  async function pickImage() {
    const result = await pickGroupImage(locale);
    if (!result) {
      return;
    }
    if (!result.image.ok) {
      setImageError(result.image.error);
      return;
    }
    setImageError(null);
    setPicked({ uri: result.uri, upload: result.image });
  }

  return (
    <Screen
      footer={
        <GroupCreateFooter
          name={name}
          pending={submitting}
          onSubmit={() => void submit()}
        />
      }
    >
      <GroupCreateView
        name={name}
        onNameChange={setName}
        nameError={nameError}
        formError={formError}
        sports={SPORTS}
        showSportPicker
        sport={sport}
        onSportChange={setPickedSport}
        type={type}
        onTypeChange={(next) => {
          setType(next);
          if (next === "private") {
            setRequiresApproval(false);
          }
        }}
        requiresApproval={requiresApproval}
        onRequiresApprovalChange={setRequiresApproval}
        imageUri={picked?.uri ?? null}
        imageError={imageError}
        onPickImage={() => void pickImage()}
        onClearImage={() => {
          setPicked(null);
          setImageError(null);
        }}
        pending={submitting}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
