import { useUser } from "@clerk/expo";
import {
  COMMUNITY_CREATED_TOAST,
  COMMUNITY_CREATE_NOT_AVAILABLE,
} from "@repo/domain/community";
import type { CommunityVisibility } from "@repo/domain/community-chrome";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";

import { splitTrpcFormError } from "../lib/form-error";
import { Screen } from "../primitives/screen";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { communityPath } from "./communities-model";
import { CommunityCreateView } from "./community-create-view";

export function CommunityCreateScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [type, setType] = useState<CommunityVisibility>("public");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const create = api.communities.create.useMutation({
    onSuccess: async (community) => {
      toast.show(COMMUNITY_CREATED_TOAST);
      await utils.communities.mine.invalidate();
      router.replace(communityPath(community.id));
    },
    onError: (error) => {
      const split = splitTrpcFormError(error);
      setNameError(split.fieldErrors.name ?? null);
      setFormError(
        split.globalMessage ?? (split.fieldErrors.name ? null : error.message),
      );
      toast.show(
        split.globalMessage ?? split.fieldErrors.name ?? error.message,
      );
    },
  });

  function submit() {
    if (create.isPending) {
      return;
    }
    setNameError(null);
    setFormError(null);
    create.mutate({ name, type, sports: ["padel"] });
  }

  if (isLoaded && user?.publicMetadata.groupCreator !== true) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Create Community" }} />
        <Surface style={{ gap: 8 }} accessibilityRole="alert">
          <Text size="lead" weight="semibold">
            {COMMUNITY_CREATE_NOT_AVAILABLE.title}
          </Text>
          <Text size="meta" tone="muted">
            {COMMUNITY_CREATE_NOT_AVAILABLE.description}
          </Text>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Create Community" }} />
      <CommunityCreateView
        name={name}
        onNameChange={setName}
        nameError={nameError}
        formError={formError}
        type={type}
        onTypeChange={setType}
        pending={create.isPending}
        onSubmit={submit}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
