import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getS3Object } = vi.hoisted(() => ({
  getS3Object: vi.fn(),
}));

vi.mock("~/server/storage/s3", () => ({
  getS3Object,
  putS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

import { GET } from "./route";

const VENUE_ID = "11111111-1111-4111-8111-111111111111";
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

function request(venueId: string, search = "") {
  return new NextRequest(
    `http://localhost/api/media/venue-logos/${venueId}/logo${search}`,
  );
}

function context(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

describe("GET /api/media/venue-logos/{venueId}/logo", () => {
  beforeEach(() => {
    getS3Object.mockReset();
  });

  it("returns 404 with no-store when the id is not a UUID", async () => {
    const response = await GET(request("not-a-uuid"), context("not-a-uuid"));

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getS3Object).not.toHaveBeenCalled();
    await expect(response.text()).resolves.toBe("");
  });

  it("returns 404 with no-store when the object is missing", async () => {
    getS3Object.mockResolvedValue(null);

    const response = await GET(request(VENUE_ID), context(VENUE_ID));

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getS3Object).toHaveBeenCalledWith(`venue-logos/${VENUE_ID}/logo`);
    await expect(response.text()).resolves.toBe("");
  });

  it("streams the object without a session and ignores v", async () => {
    getS3Object.mockResolvedValue({
      body: PNG_BYTES,
      contentType: "image/png",
    });

    const response = await GET(
      request(VENUE_ID, "?v=1700000000000"),
      context(VENUE_ID),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toBe("inline");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from(PNG_BYTES),
    );
  });

  it("returns 502 without provider internals when S3 fails", async () => {
    getS3Object.mockRejectedValue(
      new Error("The AWS Access Key Id you provided does not exist"),
    );

    const response = await GET(request(VENUE_ID), context(VENUE_ID));
    const body = await response.text();

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toBe("");
    expect(body).not.toMatch(/AWS Access Key|credentials/i);
  });
});
