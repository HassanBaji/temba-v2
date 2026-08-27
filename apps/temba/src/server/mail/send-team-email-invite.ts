/**
 * Transactional email provider is TBD.
 * Creators still get a usable invite URL; this stub records the intended send.
 * Do not log invite URLs — they contain bearer tokens.
 */
export async function sendTeamEmailInviteMail(input: {
  to: string;
  teamName: string;
  inviteUrl: string;
}) {
  void input.inviteUrl;
  console.info("[mail:stub] team email invite", {
    to: input.to,
    teamName: input.teamName,
  });
}
