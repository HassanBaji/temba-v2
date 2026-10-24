import { useUser } from "@clerk/expo";
import {
  COMMUNITY_CREATED_TOAST,
  COMMUNITY_CREATE_COPY,
  COMMUNITY_CREATE_NOT_AVAILABLE,
} from "@repo/domain/community";
import { toggleCommunitySport } from "@repo/domain/community-sports";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import type { CommunityVisibility } from "@repo/domain/community-chrome";
import { useRouter } from "expo-router";
import { useState } from "react";

import { splitTrpcFormError } from "../lib/form-error";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { COMMUNITIES_PATH, communityPath } from "./communities-model";
import { CommunityCreateView } from "./community-create-view";

export function CommunityCreateScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [type, setType] = useState<CommunityVisibility>("public");
  const [sports, setSports] = useState<Sport[]>([DEFAULT_SPORT]);
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
    if (create.isPending || sports.length === 0) {
      return;
    }
    setNameError(null);
    setFormError(null);
    create.mutate({ name, type, sports });
  }

  if (isLoaded && user?.publicMetadata.groupCreator !== true) {
    return (
      <Screen>
        <ScreenHeader
          nav="close"
          fallback={COMMUNITIES_PATH}
          title={COMMUNITY_CREATE_COPY.title}
        />
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
      <CommunityCreateView
        name={name}
        onNameChange={setName}
        nameError={nameError}
        formError={formError}
        type={type}
        onTypeChange={setType}
        sports={sports}
        onToggleSport={(sport) =>
          setSports((current) => toggleCommunitySport(current, sport))
        }
        pending={create.isPending}
        onSubmit={submit}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
