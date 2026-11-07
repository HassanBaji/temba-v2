import sharp from "sharp";

/**
 * WhatsApp draws an og:image smaller than 600×315 as a small thumbnail beside
 * the title, and a larger one as a full-width banner above it. Invite previews
 * want the Group logo beside the Group name, so the logo is shrunk to a square
 * well under that bound and kept far below WhatsApp's ~300 KB image limit.
 */
export const INVITE_PREVIEW_THUMBNAIL_SIZE = 300;

export async function invitePreviewThumbnail(
  imageUrl: string | null,
  fetchImage: typeof fetch = fetch,
): Promise<Response> {
  if (!imageUrl) {
    return new Response(null, { status: 404 });
  }
  try {
    const upstream = await fetchImage(imageUrl);
    if (!upstream.ok) {
      return new Response(null, { status: 404 });
    }
    const thumbnail = await sharp(Buffer.from(await upstream.arrayBuffer()))
      .resize(INVITE_PREVIEW_THUMBNAIL_SIZE, INVITE_PREVIEW_THUMBNAIL_SIZE, {
        fit: "contain",
        background: "white",
      })
      .flatten({ background: "white" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return new Response(new Uint8Array(thumbnail), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
