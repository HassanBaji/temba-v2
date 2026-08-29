import { auth } from "@clerk/nextjs/server";

import { AcceptInviteFlow } from "~/components/invites/accept-invite-flow";
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
      <AcceptInviteFlow
        kind="team"
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
