import { auth } from "@clerk/nextjs/server";

import { AcceptCommunityEmailInvite } from "~/components/invites/accept-community-email-invite";
import { InviteShell } from "~/components/invites/invite-shell";
import { communityEmailInvitePath } from "~/lib/invite-paths";

export default async function CommunityEmailInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  const returnPath = communityEmailInvitePath(token);

  return (
    <InviteShell>
      <AcceptCommunityEmailInvite
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
