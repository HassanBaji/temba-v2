import { beforeAll, describe, expect, it } from "vitest";

import {
  MEDIA_URL_EXPIRES_SECONDS,
  MEDIA_URL_WINDOW_MS,
  signMediaUrl,
  signMediaUrls,
  storedMediaObject,
} from "#src/storage/media-urls";
import {
  createCallerFactory,
  createTRPCContext,
  createTRPCRouter,
  publicProcedure,
} from "#src/trpc";

const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const VENUE_ID = "33333333-3333-4333-8333-333333333333";
const PHOTO_ID = "44444444-4444-4444-8444-444444444444";

const GROUP_IMAGE = `/api/media/group-images/${GROUP_ID}/image?v=1700000000000`;
const VENUE_PHOTO = `/api/media/venue-photos/${VENUE_ID}/${PHOTO_ID}`;

const WINDOW_START = MEDIA_URL_WINDOW_MS * 300;

beforeAll(() => {
  process.env.AWS_ENDPOINT_URL = "https://t3.storageapi.dev";
  process.env.AWS_ACCESS_KEY_ID = "test-access-key";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.AWS_S3_BUCKET_NAME = "temba-media";
  process.env.AWS_DEFAULT_REGION = "auto";
});

describe("storedMediaObject", () => {
  it("names the bucket object and version of a stored path", () => {
    expect(storedMediaObject(GROUP_IMAGE)).toEqual({
      key: `group-images/${GROUP_ID}/image`,
      version: "1700000000000",
    });
    expect(storedMediaObject(VENUE_PHOTO)).toEqual({
      key: `venue-photos/${VENUE_ID}/${PHOTO_ID}`,
      version: null,
    });
  });

  it.each([
    "https://example.supabase.co/storage/v1/object/public/logo.png",
    "/api/media/other/x/y",
    "/api/media/group-images/x",
    "/api/trpc/groups.byId",
    "Bromma Padel",
  ])("ignores %s", (value) => {
    expect(storedMediaObject(value)).toBe(null);
  });
});

describe("signMediaUrl", () => {
  it("presigns a GET on the bucket object with the version and a long cache", async () => {
    const url = new URL(await signMediaUrl(GROUP_IMAGE, WINDOW_START + 1000));
    expect(url.origin).toBe("https://temba-media.t3.storageapi.dev");
    expect(url.pathname).toBe(`/group-images/${GROUP_ID}/image`);
    expect(url.searchParams.get("v")).toBe("1700000000000");
    expect(url.searchParams.get("response-cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(url.searchParams.get("X-Amz-Expires")).toBe(
      String(MEDIA_URL_EXPIRES_SECONDS),
    );
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hands out one URL for the whole window", async () => {
    const early = await signMediaUrl(GROUP_IMAGE, WINDOW_START);
    const late = await signMediaUrl(
      GROUP_IMAGE,
      WINDOW_START + MEDIA_URL_WINDOW_MS - 1,
    );
    expect(late).toBe(early);
  });

  it("changes the URL in the next window", async () => {
    const current = await signMediaUrl(GROUP_IMAGE, WINDOW_START);
    const next = await signMediaUrl(
      GROUP_IMAGE,
      WINDOW_START + MEDIA_URL_WINDOW_MS,
    );
    expect(next).not.toBe(current);
  });

  it("changes the URL when the image is replaced", async () => {
    const before = await signMediaUrl(GROUP_IMAGE, WINDOW_START);
    const after = await signMediaUrl(
      GROUP_IMAGE.replace("v=1700000000000", "v=1700000000500"),
      WINDOW_START,
    );
    expect(after).not.toBe(before);
  });

  it("leaves other strings unchanged", async () => {
    const clerk = "https://img.clerk.com/user.png";
    await expect(signMediaUrl(clerk)).resolves.toBe(clerk);
  });
});

describe("signMediaUrls", () => {
  it("signs stored paths anywhere in an output and keeps everything else", async () => {
    const createdAt = new Date("2026-10-20T10:00:00Z");
    const output = {
      group: { name: "Bromma", imageUrl: GROUP_IMAGE, createdAt },
      photos: [{ id: PHOTO_ID, imageUrl: VENUE_PHOTO }, { imageUrl: null }],
      logoImageUrl: GROUP_IMAGE,
    };

    const signed = await signMediaUrls(output, WINDOW_START);

    expect(signed.group.name).toBe("Bromma");
    expect(signed.group.createdAt).toBe(createdAt);
    expect(signed.group.imageUrl).toMatch(
      /^https:\/\/temba-media\.t3\.storageapi\.dev\/group-images\//,
    );
    expect(signed.logoImageUrl).toBe(signed.group.imageUrl);
    expect(signed.photos[0]?.imageUrl).toMatch(
      /^https:\/\/temba-media\.t3\.storageapi\.dev\/venue-photos\//,
    );
    expect(signed.photos[1]?.imageUrl).toBe(null);
    expect(output.group.imageUrl).toBe(GROUP_IMAGE);
  });

  it("returns an output without stored paths as it is", async () => {
    const output = { items: [{ name: "Bromma" }] };
    await expect(signMediaUrls(output)).resolves.toBe(output);
  });
});

describe("procedure outputs", () => {
  it("leave the API with presigned bucket URLs", async () => {
    const router = createTRPCRouter({
      image: publicProcedure.query(() => ({ imageUrl: GROUP_IMAGE })),
    });
    const caller = createCallerFactory(router)(() =>
      createTRPCContext({
        db: {} as Parameters<typeof createTRPCContext>[0]["db"],
        userId: null,
        getPublicMetadata: async () => undefined,
        headers: new Headers(),
        webOrigin: "https://temba.example",
      }),
    );
    const result = await caller.image();
    expect(result.imageUrl).toMatch(
      /^https:\/\/temba-media\.t3\.storageapi\.dev\/group-images\/.+X-Amz-Signature=/,
    );
  });
});
