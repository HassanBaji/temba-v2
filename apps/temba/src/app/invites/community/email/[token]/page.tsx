import { AcceptCommunityEmailInvite } from "~/components/invites/accept-community-email-invite";
import { InviteShell } from "~/components/invites/invite-shell";

export default async function CommunityEmailInvitePage() {
  return (
    <InviteShell>
      <AcceptCommunityEmailInvite />
    </InviteShell>
  );
}
