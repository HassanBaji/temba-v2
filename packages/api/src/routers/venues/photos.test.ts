import { beforeEach, describe, expect, it, vi } from "vitest";

const { putS3Object, deleteS3Object } = vi.hoisted(() => ({
  putS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

vi.mock("#src/storage/s3", () => ({
  putS3Object,
  deleteS3Object,
}));

import { eq } from "drizzle-orm";

import { user, venueManagers, venuePhotos, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { VENUE_PHOTO_LIMIT } from "@repo/domain/venue-photos";

import { deletePhoto } from "#src/routers/venues/deletePhoto";
import { managedVenueById } from "#src/routers/venues/managedById";
import { setDisplayPhotos } from "#src/routers/venues/setDisplayPhotos";
import { uploadPhoto } from "#src/routers/venues/uploadPhoto";

const PNG_BASE64 = Buffer.from(
  Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]),
).toString("base64");

async function seed(database: TestDatabase) {
  const [manager] = await database
    .insert(user)
    .values({ name: "Manager", email: "manager@example.com" })
    .returning({ id: user.id });
  const [mine] = await database
    .insert(venues)
    .values({ name: "Mine", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [theirs] = await database
    .insert(venues)
    .values({ name: "Theirs", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!manager || !mine || !theirs) {
    throw new Error("seed failed");
  }
  await database
    .insert(venueManagers)
    .values({ venueId: mine.id, userId: manager.id });
  return {
    mine: mine.id,
    theirs: theirs.id,
    manager: { userId: manager.id, publicMetadata: undefined },
    operator: { userId: manager.id, publicMetadata: { operator: true } },
  };
}

function upload(
  database: TestDatabase,
  venueId: string,
  actor: Awaited<ReturnType<typeof seed>>["manager"],
) {
  return uploadPhoto(database, {
    venueId,
    contentType: "image/png",
    dataBase64: PNG_BASE64,
    actor,
  });
}

async function displayPhotos(database: TestDatabase, venueId: string) {
  const row = await database.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: { coverPhotoId: true, detailPhotoId: true },
  });
  return row;
}

describe("Venue photo doors", () => {
  beforeEach(() => {
    putS3Object.mockReset();
    deleteS3Object.mockReset();
  });

  it("makes the first photo both the main and the details photo", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      const first = await upload(db, s.mine, s.manager);
      const second = await upload(db, s.mine, s.manager);

      expect(first.imageUrl).toBe(
        `/api/media/venue-photos/${s.mine}/${first.id}`,
      );
      expect(putS3Object).toHaveBeenCalledWith(
        expect.objectContaining({
          key: `venue-photos/${s.mine}/${first.id}`,
          contentType: "image/png",
        }),
      );
      expect(await displayPhotos(db, s.mine)).toEqual({
        coverPhotoId: first.id,
        detailPhotoId: first.id,
      });

      const managed = await managedVenueById(db, {
        venueId: s.mine,
        ...s.manager,
      });
      expect(managed.photos.map((photo) => photo.id)).toEqual([
        first.id,
        second.id,
      ]);
      expect(managed.coverImageUrl).toBe(first.imageUrl);
      expect(managed.detailImageUrl).toBe(first.imageUrl);
    } finally {
      await close();
    }
  });

  it("lets a manager pick the main and details photos separately", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      const first = await upload(db, s.mine, s.manager);
      const second = await upload(db, s.mine, s.manager);

      await setDisplayPhotos(db, {
        venueId: s.mine,
        detailPhotoId: second.id,
        actor: s.manager,
      });
      expect(await displayPhotos(db, s.mine)).toEqual({
        coverPhotoId: first.id,
        detailPhotoId: second.id,
      });

      await setDisplayPhotos(db, {
        venueId: s.mine,
        coverPhotoId: second.id,
        detailPhotoId: first.id,
        actor: s.manager,
      });
      expect(await displayPhotos(db, s.mine)).toEqual({
        coverPhotoId: second.id,
        detailPhotoId: first.id,
      });
    } finally {
      await close();
    }
  });

  it("refuses a photo from another Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      const theirPhoto = await upload(db, s.theirs, s.operator);
      await expect(
        setDisplayPhotos(db, {
          venueId: s.mine,
          coverPhotoId: theirPhoto.id,
          actor: s.manager,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        deletePhoto(db, {
          venueId: s.mine,
          photoId: theirPhoto.id,
          actor: s.manager,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(deleteS3Object).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("refuses a manager on a Venue they do not manage", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      await expect(upload(db, s.theirs, s.manager)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(putS3Object).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("hands a deleted main photo's place to the oldest photo left", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      const first = await upload(db, s.mine, s.manager);
      const second = await upload(db, s.mine, s.manager);
      await setDisplayPhotos(db, {
        venueId: s.mine,
        detailPhotoId: second.id,
        actor: s.manager,
      });

      const afterFirst = await deletePhoto(db, {
        venueId: s.mine,
        photoId: first.id,
        actor: s.manager,
      });
      expect(afterFirst).toMatchObject({
        coverPhotoId: second.id,
        detailPhotoId: second.id,
      });
      expect(deleteS3Object).toHaveBeenCalledWith(
        `venue-photos/${s.mine}/${first.id}`,
      );

      const afterSecond = await deletePhoto(db, {
        venueId: s.mine,
        photoId: second.id,
        actor: s.manager,
      });
      expect(afterSecond).toMatchObject({
        coverPhotoId: null,
        detailPhotoId: null,
      });
    } finally {
      await close();
    }
  });

  it("refuses a photo past the limit", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      await db
        .insert(venuePhotos)
        .values(
          Array.from({ length: VENUE_PHOTO_LIMIT }, () => ({
            venueId: s.mine,
          })),
        );
      await expect(upload(db, s.mine, s.manager)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(putS3Object).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("refuses bytes that are not the declared image type", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      await expect(
        uploadPhoto(db, {
          venueId: s.mine,
          contentType: "image/jpeg",
          dataBase64: PNG_BASE64,
          actor: s.manager,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });
});
