"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useMessages } from "~/components/locale-provider";
import { SETTINGS_PATH } from "~/components/settings/settings-screen";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import type { Sport } from "@repo/domain/sport";

/** Adds or removes a sport from the profile, then goes where it shows. */
export function useSetSport(sport: Sport) {
  const m = useMessages();
  const router = useRouter();
  const utils = api.useUtils();
  return api.users.setSports.useMutation({
    onSuccess: async (result) => {
      const added = result.sports.includes(sport);
      toast.success(
        added
          ? m.webYou.settings.sportAdded(m.common[sport])
          : m.webYou.settings.sportRemoved(m.common[sport]),
      );
      await utils.users.invalidate();
      router.push(added ? "/dashboard/you" : SETTINGS_PATH);
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
}
