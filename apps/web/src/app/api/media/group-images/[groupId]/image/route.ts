import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getGroupImageObject } from "~/server/storage/group-images";

export const runtime = "nodejs";

const groupIdParam = z.string().uuid();

const noStore = { "Cache-Control": "no-store" };

function notFoundResponse() {
  return new NextResponse(null, { status: 404, headers: noStore });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  if (!groupIdParam.safeParse(groupId).success) {
    return notFoundResponse();
  }

  try {
    const object = await getGroupImageObject(groupId);
    if (!object) {
      return notFoundResponse();
    }

    return new NextResponse(Buffer.from(object.bytes), {
      status: 200,
      headers: {
        "Content-Type": object.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502, headers: noStore });
  }
}
