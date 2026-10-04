import { TEAM_CREATED_TOAST, teamNameInput } from "@repo/domain/teams";
import { useRouter } from "expo-router";
import { useState } from "react";

import { splitTrpcFormError } from "../lib/form-error";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { CreateTeamView } from "./create-team-view";
import { teamPath } from "./teams-model";

export function CreateTeamScreen() {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const create = api.teams.create.useMutation({
    onSuccess: async (team) => {
      toast.show(TEAM_CREATED_TOAST);
      await utils.teams.mine.invalidate();
      router.replace(teamPath(team.id));
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
    create.mutate({ name: teamNameInput(name), sport: "padel" });
  }

  return (
    <Screen>
      <CreateTeamView
        name={name}
        onNameChange={setName}
        nameError={nameError}
        formError={formError}
        pending={create.isPending}
        onSubmit={submit}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
