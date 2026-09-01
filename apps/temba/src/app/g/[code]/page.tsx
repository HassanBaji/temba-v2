import { auth } from "@clerk/nextjs/server";

import { AcceptGameInviteLink } from "~/components/invites/accept-game-invite-link";
import { InviteShell } from "~/components/invites/invite-shell";
import { gameInviteShortPath } from "~/lib/invite-paths";
import { db } from "~/server/db";
import { findGameInviteLinkByShortCode } from "~/server/invites/doors";

export default async function GameInviteShortCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { userId } = await auth();
  const link = await findGameInviteLinkByShortCode(db, code);
  const token = link?.token ?? "invalid";
  const returnPath = gameInviteShortPath(code);

  return (
    <InviteShell wide>
      <AcceptGameInviteLink
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
