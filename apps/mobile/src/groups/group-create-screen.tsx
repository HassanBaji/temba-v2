import { useUser } from "@clerk/expo";
import {
  GROUP_CREATE_COPY,
  GROUP_CREATE_NOT_AVAILABLE,
  GROUP_CREATED_TOAST,
  groupCreateDoor,
  groupCreateRequiresApproval,
  type GroupCreateType,
} from "@repo/domain/group-create";
import { GROUP_CREATED_WITHOUT_IMAGE_TOAST } from "@repo/domain/entity-image-file";
import { useRouter } from "expo-router";
import { useState } from "react";

import { splitTrpcFormError } from "../lib/form-error";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { GroupCreateView } from "./group-create-view";
import { groupPath } from "./groups-model";
import { pickGroupImage } from "./pick-group-image";
import type { PickedImage } from "./group-image";

type Picked = { uri: string; upload: PickedImage & { ok: true } };

export function GroupCreateScreen({ communityId }: { communityId?: string }) {
  const context = communityId ? "club" : "loose";
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupCreateType>("public");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createLoosePublic = api.groups.createLoosePublic.useMutation();
  const createLoosePrivate = api.groups.createLoosePrivate.useMutation();
  const createClubPublic = api.groups.createClubPublic.useMutation();
  const createClubPrivate = api.groups.createClubPrivate.useMutation();
  const uploadImage = api.groups.uploadImage.useMutation();

  async function createGroup(trimmed: string) {
    const door = groupCreateDoor(context, type);
    const base = { name: trimmed, sport: "padel" as const };
    const approval = groupCreateRequiresApproval(type, requiresApproval);
    switch (door) {
      case "createLoosePublic":
        return createLoosePublic.mutateAsync({
          ...base,
          requiresApproval: approval,
        });
      case "createLoosePrivate":
        return createLoosePrivate.mutateAsync(base);
      case "createClubPublic":
        return createClubPublic.mutateAsync({
          ...base,
          communityId: communityId ?? "",
          requiresApproval: approval,
        });
      case "createClubPrivate":
        return createClubPrivate.mutateAsync({
          ...base,
          communityId: communityId ?? "",
        });
    }
  }

  async function refreshAfterCreate() {
    await Promise.all([
      utils.groups.mine.invalidate(),
      utils.users.home.invalidate(),
      communityId
        ? utils.communities.byId.invalidate({ id: communityId })
        : Promise.resolve(),
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
    let message = GROUP_CREATED_TOAST;
    if (picked) {
      try {
        await uploadImage.mutateAsync({
          groupId,
          contentType: picked.upload.contentType,
          dataBase64: picked.upload.dataBase64,
        });
      } catch {
        message = GROUP_CREATED_WITHOUT_IMAGE_TOAST;
      }
    }
    toast.show(message);
    await refreshAfterCreate();
    setSubmitting(false);
    router.replace(groupPath(groupId));
  }

  async function pickImage() {
    const result = await pickGroupImage();
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

  if (
    context === "loose" &&
    isLoaded &&
    user?.publicMetadata.groupCreator !== true
  ) {
    return (
      <Screen>
        <ScreenHeader
          nav="close"
          fallback="/groups"
          title={GROUP_CREATE_COPY.loose.submit}
        />
        <Surface style={{ gap: 8 }} accessibilityRole="alert">
          <Text size="lead" weight="semibold">
            {GROUP_CREATE_NOT_AVAILABLE.title}
          </Text>
          <Text size="meta" tone="muted">
            {GROUP_CREATE_NOT_AVAILABLE.description}
          </Text>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <GroupCreateView
        context={context}
        name={name}
        onNameChange={setName}
        nameError={nameError}
        formError={formError}
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
        onSubmit={() => void submit()}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
