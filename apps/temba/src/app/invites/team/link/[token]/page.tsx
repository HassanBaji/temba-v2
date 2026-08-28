import { auth } from "@clerk/nextjs/server";

import { AcceptTeamInviteLink } from "~/components/invites/accept-team-invite-link";
import { InviteShell } from "~/components/invites/invite-shell";
import { teamInviteLinkPath } from "~/lib/invite-paths";

export default async function TeamInviteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  const returnPath = teamInviteLinkPath(token);

  return (
    <InviteShell>
      <AcceptTeamInviteLink
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
