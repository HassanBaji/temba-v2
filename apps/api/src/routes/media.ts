import { getGroupImageObject } from "@repo/api/storage/group-images";
import { getVenueLogoObject } from "@repo/api/storage/venue-logos";
import { Hono } from "hono";
import { z } from "zod";

const uuid = z.string().uuid();

const noStore = { "Cache-Control": "no-store" };

type StoredObject = { bytes: Uint8Array; contentType: string };

async function streamObject(
  id: string,
  load: (id: string) => Promise<StoredObject | null>,
) {
  if (!uuid.safeParse(id).success) {
    return new Response(null, { status: 404, headers: noStore });
  }
  try {
    const object = await load(id);
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
  .get("/api/media/group-images/:groupId/image", (c) =>
    streamObject(c.req.param("groupId"), getGroupImageObject),
  )
  .get("/api/media/venue-logos/:venueId/logo", (c) =>
    streamObject(c.req.param("venueId"), getVenueLogoObject),
  );
