import { DEFAULT_SPORT, isSport, type Sport } from "@repo/domain/sport";
import { teamCreateInput } from "@repo/domain/teams";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { CreateTeamView } from "./create-team-view";
import { teamPath } from "./teams-model";

export function CreateTeamScreen({ groupId }: { groupId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [pickedSport, setSport] = useState<Sport>(DEFAULT_SPORT);

  const tagGroup = api.groups.byId.useQuery(
    { id: groupId ?? "" },
    { enabled: groupId != null },
  );
  const tag =
    groupId && tagGroup.data?.canCreateTeam && isSport(tagGroup.data.sport)
      ? {
          id: tagGroup.data.id,
          name: tagGroup.data.name ?? m.group.untitled,
          sport: tagGroup.data.sport,
        }
      : null;
  const sport = tag?.sport ?? pickedSport;
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const create = api.teams.create.useMutation({
    onSuccess: async (team) => {
      toast.show(m.team.toast.created);
      await utils.teams.mine.invalidate();
      if (team.groupTag) {
        await utils.groups.byId.invalidate({ id: team.groupTag.id });
      }
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
    create.mutate(teamCreateInput({ name, sport, groupId: tag?.id }));
  }

  return (
    <Screen>
      <CreateTeamView
        name={name}
        sport={sport}
        onSportChange={setSport}
        tagNote={tag ? m.team.groupTag.createNote(tag.name) : null}
        onNameChange={setName}
        nameError={nameError}
        formError={formError}
        pending={create.isPending || (groupId != null && tagGroup.isLoading)}
        onSubmit={submit}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
