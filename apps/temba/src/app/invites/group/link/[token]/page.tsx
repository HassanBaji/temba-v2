import { auth } from "@clerk/nextjs/server";

import { AcceptGroupInviteLink } from "~/components/invites/accept-group-invite-link";
import { InviteShell } from "~/components/invites/invite-shell";
import { groupInviteLinkPath } from "~/lib/invite-paths";

export default async function GroupInviteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  const returnPath = groupInviteLinkPath(token);

  return (
    <InviteShell>
      <AcceptGroupInviteLink
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
