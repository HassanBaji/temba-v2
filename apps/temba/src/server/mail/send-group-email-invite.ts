/**
 * Transactional email provider is TBD.
 * Creators still get a usable invite URL; this stub records the intended send.
 * Do not log invite URLs — they contain bearer tokens.
 */
export async function sendGroupEmailInviteMail(input: {
  to: string;
  groupName: string;
  inviteUrl: string;
}) {
  void input.inviteUrl;
  console.info("[mail:stub] group email invite", {
    to: input.to,
    groupName: input.groupName,
  });
}
