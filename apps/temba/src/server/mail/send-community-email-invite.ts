/**
 * Transactional email provider is TBD.
 * Staff still get a usable invite URL; this stub records the intended send.
 */
export async function sendCommunityEmailInviteMail(input: {
  to: string;
  communityName: string;
  inviteUrl: string;
}) {
  console.info("[mail:stub] community email invite", {
    to: input.to,
    communityName: input.communityName,
    inviteUrl: input.inviteUrl,
  });
}
