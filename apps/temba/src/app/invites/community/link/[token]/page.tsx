import { auth } from "@clerk/nextjs/server";

import { AcceptCommunityInviteLink } from "~/components/invites/accept-community-invite-link";
import { InviteShell } from "~/components/invites/invite-shell";
import { communityInviteLinkPath } from "~/lib/invite-paths";

export default async function CommunityInviteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  const returnPath = communityInviteLinkPath(token);

  return (
    <InviteShell>
      <AcceptCommunityInviteLink
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
