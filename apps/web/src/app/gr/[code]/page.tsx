import { auth } from "@clerk/nextjs/server";
import { type Metadata } from "next";

import { AcceptInviteFlow } from "~/components/invites/accept-invite-flow";
import { InviteShell } from "~/components/invites/invite-shell";
import { GENERIC_TEMBA_OPEN_GRAPH } from "@repo/domain/game-invite-open-graph";
import { groupInviteShortPath } from "@repo/domain/invite-paths";
import { db } from "~/server/db";
import { findGroupInviteLinkByShortCode } from "~/server/invites/doors";
import { loadGroupInviteOpenGraph } from "~/server/invites/group-invite-open-graph";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const fields = await loadGroupInviteOpenGraph(db, code);
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

export default async function GroupInviteShortCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { userId } = await auth();
  const link = await findGroupInviteLinkByShortCode(db, code);
  const token = link?.token ?? "invalid";
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
