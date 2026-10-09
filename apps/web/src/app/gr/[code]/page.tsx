import { auth } from "@clerk/nextjs/server";
import { type Metadata } from "next";

import { AcceptInviteFlow } from "~/components/invites/accept-invite-flow";
import { InviteShell } from "~/components/invites/invite-shell";
import { GENERIC_TEMBA_OPEN_GRAPH } from "@repo/domain/game-invite-open-graph";
import { groupInviteShortPath } from "@repo/domain/invite-paths";
import { createApiClient } from "~/trpc/api-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const api = await createApiClient();
  const fields = await api.groups.inviteLinkByShortCode.query({ code });
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

export default async function GroupInviteShortCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { userId } = await auth();
  const api = await createApiClient();
  const { token: linkToken } = await api.groups.inviteLinkByShortCode.query({
    code,
  });
  const token = linkToken ?? "invalid";
  const returnPath = groupInviteShortPath(code);

  return (
    <InviteShell>
      <AcceptInviteFlow
        kind="group"
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
