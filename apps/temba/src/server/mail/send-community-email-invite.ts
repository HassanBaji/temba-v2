/**
 * Transactional email provider is TBD.
 * Staff still get a usable invite URL; this stub records the intended send.
 * Do not log invite URLs — they contain bearer tokens.
 */
export async function sendCommunityEmailInviteMail(input: {
  to: string;
  communityName: string;
  inviteUrl: string;
}) {
  void input.inviteUrl;
  console.info("[mail:stub] community email invite", {
    to: input.to,
    communityName: input.communityName,
  });
}
