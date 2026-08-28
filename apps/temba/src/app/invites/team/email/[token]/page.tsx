import { AcceptTeamEmailInvite } from "~/components/invites/accept-team-email-invite";
import { InviteShell } from "~/components/invites/invite-shell";

export default async function TeamEmailInvitePage() {
  return (
    <InviteShell>
      <AcceptTeamEmailInvite />
    </InviteShell>
  );
}
