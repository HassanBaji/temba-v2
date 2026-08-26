import { auth } from "@clerk/nextjs/server";

import { AcceptGroupEmailInvite } from "~/components/invites/accept-group-email-invite";
import { InviteShell } from "~/components/invites/invite-shell";
import { groupEmailInvitePath } from "~/lib/invite-paths";

export default async function GroupEmailInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  const returnPath = groupEmailInvitePath(token);

  return (
    <InviteShell>
      <AcceptGroupEmailInvite
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
