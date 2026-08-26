/**
 * Transactional email provider is TBD.
 * Creators still get a usable invite URL; this stub records the intended send.
 */
export async function sendGroupEmailInviteMail(input: {
  to: string;
  groupName: string;
  inviteUrl: string;
}) {
  console.info("[mail:stub] group email invite", {
    to: input.to,
    groupName: input.groupName,
    inviteUrl: input.inviteUrl,
  });
}
