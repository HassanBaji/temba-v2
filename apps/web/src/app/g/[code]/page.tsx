import { auth } from "@clerk/nextjs/server";
import { type Metadata } from "next";

import { AcceptGameInviteLink } from "~/components/invites/accept-game-invite-link";
import { InviteShell } from "~/components/invites/invite-shell";
import { GENERIC_TEMBA_OPEN_GRAPH } from "@repo/domain/game-invite-open-graph";
import { gameInviteShortPath } from "@repo/domain/invite-paths";
import { createApiClient } from "~/trpc/api-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const api = await createApiClient();
  const fields = await api.games.inviteLinkByShortCode.query({ code });
  return {
    title:
      fields.title === GENERIC_TEMBA_OPEN_GRAPH.title
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
  const api = await createApiClient();
  const { token: linkToken } = await api.games.inviteLinkByShortCode.query({
    code,
  });
  const token = linkToken ?? "invalid";
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
