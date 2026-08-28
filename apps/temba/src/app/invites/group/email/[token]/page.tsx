import { AcceptGroupEmailInvite } from "~/components/invites/accept-group-email-invite";
import { InviteShell } from "~/components/invites/invite-shell";

export default async function GroupEmailInvitePage() {
  return (
    <InviteShell>
      <AcceptGroupEmailInvite />
    </InviteShell>
  );
}
