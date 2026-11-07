import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  INVITE_PREVIEW_THUMBNAIL_SIZE,
  invitePreviewThumbnail,
} from "./invite-preview-thumbnail";

async function webpLogo(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 4, background: "black" },
  })
    .webp()
    .toBuffer();
}

function serving(body: Buffer | null, status = 200): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(body ? new Uint8Array(body) : null, { status }),
    );
}

describe("invitePreviewThumbnail", () => {
  it("shrinks a large WebP logo to a small square JPEG", async () => {
    const response = await invitePreviewThumbnail(
      "https://bucket.example/logo",
      serving(await webpLogo(1800, 2400)),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    const metadata = await sharp(
      Buffer.from(await response.arrayBuffer()),
    ).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(INVITE_PREVIEW_THUMBNAIL_SIZE);
    expect(metadata.height).toBe(INVITE_PREVIEW_THUMBNAIL_SIZE);
  });

  it("answers 404 without a logo, for a missing object, and for bytes that are not an image", async () => {
    expect((await invitePreviewThumbnail(null)).status).toBe(404);
    expect(
      (
        await invitePreviewThumbnail(
          "https://bucket.example/x",
          serving(null, 403),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await invitePreviewThumbnail(
          "https://bucket.example/x",
          serving(Buffer.from("not an image")),
        )
      ).status,
    ).toBe(404);
  });
});
