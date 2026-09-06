import {
  groupInviteDisplayName,
  groupInviteInvitationLine,
} from "~/lib/group-invite-share-message";

export function groupInviteOpenGraphMetadata(input: {
  groupName: string | null | undefined;
  sport: string | null | undefined;
}) {
  const name = groupInviteDisplayName(input.groupName);
  return {
    title: name,
    description: groupInviteInvitationLine({
      groupName: name,
      sport: input.sport,
    }),
  };
}
