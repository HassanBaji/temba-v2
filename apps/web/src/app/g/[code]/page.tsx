import { auth } from "@clerk/nextjs/server";
import { type Metadata } from "next";

import { AcceptGameInviteLink } from "~/components/invites/accept-game-invite-link";
import { InviteShell } from "~/components/invites/invite-shell";
import { GENERIC_TEMBA_OPEN_GRAPH } from "@repo/domain/game-invite-open-graph";
import { gameInviteShortPath } from "@repo/domain/invite-paths";
import { db } from "@repo/db";
import { findGameInviteLinkByShortCode } from "@repo/api/invites/doors";
import { loadGameInviteOpenGraph } from "@repo/api/invites/game-invite-open-graph";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const fields = await loadGameInviteOpenGraph(db, code);
  return {
    title:
      fields === GENERIC_TEMBA_OPEN_GRAPH
        ? { absolute: fields.title }
        : fields.title,
    description: fields.description,
    openGraph: {
      title: fields.title,
      description: fields.description,
    },
  };
}

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
