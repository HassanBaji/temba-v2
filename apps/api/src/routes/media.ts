import { getGroupImageObject } from "@repo/api/storage/group-images";
import { getVenueLogoObject } from "@repo/api/storage/venue-logos";
import { getVenuePhotoObject } from "@repo/api/storage/venue-photos";
import { Hono } from "hono";
import { z } from "zod";

const uuid = z.string().uuid();

const noStore = { "Cache-Control": "no-store" };

type StoredObject = { bytes: Uint8Array; contentType: string };

async function streamObject(
  ids: string[],
  load: () => Promise<StoredObject | null>,
) {
  if (ids.some((id) => !uuid.safeParse(id).success)) {
    return new Response(null, { status: 404, headers: noStore });
  }
  try {
    const object = await load();
    if (!object) {
      return new Response(null, { status: 404, headers: noStore });
    }
    return new Response(Buffer.from(object.bytes), {
      status: 200,
      headers: {
        "Content-Type": object.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 502, headers: noStore });
  }
}

export const mediaRoute = new Hono()
  .get("/api/media/group-images/:groupId/image", (c) => {
    const groupId = c.req.param("groupId");
    return streamObject([groupId], () => getGroupImageObject(groupId));
  })
  .get("/api/media/venue-logos/:venueId/logo", (c) => {
    const venueId = c.req.param("venueId");
    return streamObject([venueId], () => getVenueLogoObject(venueId));
  })
  .get("/api/media/venue-photos/:venueId/:photoId", (c) => {
    const { venueId, photoId } = c.req.param();
    return streamObject([venueId, photoId], () =>
      getVenuePhotoObject(venueId, photoId),
    );
  });
