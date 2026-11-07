import { invitePreviewThumbnail } from "~/lib/invite-preview-thumbnail";
import { createApiClient } from "~/trpc/api-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const api = await createApiClient();
  const { image } = await api.groups.inviteLinkByShortCode.query({ code });
  return invitePreviewThumbnail(image);
}
