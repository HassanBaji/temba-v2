import { auth } from "@clerk/nextjs/server";

import { AcceptTeamEmailInvite } from "~/components/invites/accept-team-email-invite";
import { InviteShell } from "~/components/invites/invite-shell";
import { teamEmailInvitePath } from "~/lib/invite-paths";

export default async function TeamEmailInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  const returnPath = teamEmailInvitePath(token);

  return (
    <InviteShell>
      <AcceptTeamEmailInvite
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
