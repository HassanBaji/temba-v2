import { beforeEach, describe, expect, it, vi } from "vitest";

const { putS3Object, deleteS3Object } = vi.hoisted(() => ({
  putS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

vi.mock("#src/storage/s3", () => ({
  putS3Object,
  deleteS3Object,
}));

import { courts, user, venueManagers, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { addCourt } from "#src/routers/venues/addCourt";
import { clearLogo } from "#src/routers/venues/clearLogo";
import { deleteCourt } from "#src/routers/venues/deleteCourt";
import { renameCourt } from "#src/routers/venues/renameCourt";
import { updateVenueDetails } from "#src/routers/venues/updateDetails";
import { uploadLogo } from "#src/routers/venues/uploadLogo";

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

async function seed(database: TestDatabase) {
  const [manager] = await database
    .insert(user)
    .values({ name: "Manager", email: "manager@example.com" })
    .returning({ id: user.id });
  const [other] = await database
    .insert(user)
    .values({ name: "Other", email: "other@example.com" })
    .returning({ id: user.id });
  const [mine] = await database
    .insert(venues)
    .values({ name: "Mine", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [theirs] = await database
    .insert(venues)
    .values({ name: "Theirs", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!manager || !other || !mine || !theirs) {
    throw new Error("seed failed");
  }
  await database
    .insert(venueManagers)
    .values({ venueId: mine.id, userId: manager.id });
  const [theirCourt] = await database
    .insert(courts)
    .values({ venueId: theirs.id, name: "Court X" })
    .returning({ id: courts.id });
  if (!theirCourt) {
    throw new Error("seed failed");
  }
  return {
    mine: mine.id,
    theirs: theirs.id,
    theirCourt: theirCourt.id,
    manager: { userId: manager.id, publicMetadata: undefined },
    stranger: { userId: other.id, publicMetadata: undefined },
    operator: { userId: other.id, publicMetadata: { operator: true } },
  };
}

describe("Venue manager Court and logo doors", () => {
  beforeEach(() => {
    putS3Object.mockReset();
    deleteS3Object.mockReset();
  });

  it("lets a manager add, rename and delete a Court on their Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      const added = await addCourt(db, {
        venueId: s.mine,
        name: "Court 1",
        actor: s.manager,
      });
      const renamed = await renameCourt(db, {
        courtId: added.id,
        name: "Centre",
        actor: s.manager,
      });
      expect(renamed.name).toBe("Centre");
      await expect(
        deleteCourt(db, { courtId: added.id, actor: s.manager }),
      ).resolves.toEqual({ id: added.id });
    } finally {
      await close();
    }
  });

  it("refuses a manager on a Venue they do not manage", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      await expect(
        addCourt(db, { venueId: s.theirs, name: "New", actor: s.manager }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        renameCourt(db, {
          courtId: s.theirCourt,
          name: "Renamed",
          actor: s.manager,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        deleteCourt(db, { courtId: s.theirCourt, actor: s.manager }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        clearLogo(db, { venueId: s.theirs, actor: s.manager }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        uploadLogo(db, {
          venueId: s.theirs,
          contentType: "image/png",
          dataBase64: Buffer.from(PNG_BYTES).toString("base64"),
          actor: s.manager,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(putS3Object).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("keeps Operators working on any Venue and refuses plain Users", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      await expect(
        addCourt(db, { venueId: s.theirs, name: "Op", actor: s.operator }),
      ).resolves.toMatchObject({ name: "Op" });
      await expect(
        addCourt(db, { venueId: s.mine, name: "Nope", actor: s.stranger }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await close();
    }
  });

  it("lets a manager upload and clear a logo", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      const uploaded = await uploadLogo(db, {
        venueId: s.mine,
        contentType: "image/png",
        dataBase64: Buffer.from(PNG_BYTES).toString("base64"),
        actor: s.manager,
      });
      expect(uploaded.logoImageUrl).toBeTruthy();
      expect(putS3Object).toHaveBeenCalledTimes(1);

      const cleared = await clearLogo(db, {
        venueId: s.mine,
        actor: s.manager,
      });
      expect(cleared.logoImageUrl).toBeNull();
      expect(deleteS3Object).toHaveBeenCalledTimes(1);
    } finally {
      await close();
    }
  });
});

describe("venues.updateDetails", () => {
  it("lets a manager set and clear phone and website only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      const set = await updateVenueDetails(db, {
        venueId: s.mine,
        ...s.manager,
        phone: "+973 1234 5678",
        website: "https://club.example",
      });
      expect(set).toMatchObject({
        name: "Mine",
        city: "Manama",
        country: "BH",
        phone: "+973 1234 5678",
        website: "https://club.example",
      });

      const partial = await updateVenueDetails(db, {
        venueId: s.mine,
        ...s.manager,
        website: null,
      });
      expect(partial).toMatchObject({
        phone: "+973 1234 5678",
        website: null,
      });
    } finally {
      await close();
    }
  });

  it("refuses a manager of another Venue and does not accept identity fields", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await seed(db);
      await expect(
        updateVenueDetails(db, {
          venueId: s.theirs,
          ...s.manager,
          phone: "1",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const { updateDetails } = await import(
        "#src/routers/venues/updateDetails"
      );
      const shape = (
        updateDetails as unknown as {
          _def: { inputs: { shape: Record<string, unknown> }[] };
        }
      )._def.inputs[0]?.shape;
      expect(Object.keys(shape ?? {}).sort()).toEqual([
        "phone",
        "venueId",
        "website",
      ]);
    } finally {
      await close();
    }
  });
});
