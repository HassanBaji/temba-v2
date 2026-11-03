import type { Locale } from "@repo/i18n/locale";

import {
  groupInviteDisplayName,
  groupInviteInvitationLine,
} from "./group-invite-share-message";

export function groupInviteOpenGraphMetadata(input: {
  groupName: string | null | undefined;
  sport: string | null | undefined;
  locale: Locale;
}) {
  const name = groupInviteDisplayName(input.groupName, input.locale);
  return {
    title: name,
    description: groupInviteInvitationLine({
      groupName: name,
      sport: input.sport,
      locale: input.locale,
    }),
  };
}
