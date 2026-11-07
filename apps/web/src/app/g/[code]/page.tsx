import { auth } from "@clerk/nextjs/server";
import { type Metadata } from "next";

import { AcceptGameInviteLink } from "~/components/invites/accept-game-invite-link";
import { InviteShell } from "~/components/invites/invite-shell";
import { genericTembaOpenGraph } from "@repo/domain/game-invite-open-graph";
import { gameInviteShortPath } from "@repo/domain/invite-paths";
import { LOCALES } from "@repo/i18n/locale";
import { env } from "~/env";
import { INVITE_PREVIEW_THUMBNAIL_SIZE } from "~/lib/invite-preview-thumbnail";
import { createApiClient } from "~/trpc/api-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const api = await createApiClient();
  const fields = await api.games.inviteLinkByShortCode.query({ code });
  const images = fields.image
    ? [
        {
          url: `${env.WEB_ORIGIN}${gameInviteShortPath(code)}/image`,
          width: INVITE_PREVIEW_THUMBNAIL_SIZE,
          height: INVITE_PREVIEW_THUMBNAIL_SIZE,
          type: "image/jpeg",
          alt: fields.title,
        },
      ]
    : [];
  return {
    title: LOCALES.some(
      (locale) => fields.title === genericTembaOpenGraph(locale).title,
    )
      ? { absolute: fields.title }
      : fields.title,
    description: fields.description,
    openGraph: {
      title: fields.title,
      description: fields.description,
      images,
    },
    twitter: {
      card: "summary",
      title: fields.title,
      description: fields.description,
      images,
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
    <InviteShell tone="ink">
      <AcceptGameInviteLink
        token={token}
        isSignedIn={Boolean(userId)}
        returnPath={returnPath}
      />
    </InviteShell>
  );
}
