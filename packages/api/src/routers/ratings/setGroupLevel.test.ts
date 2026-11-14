import { describe, expect, it } from "vitest";

import { setGroupLevelForMember } from "#src/routers/ratings/setGroupLevel";

describe("ratings.setGroupLevel", () => {
  it("refuses with PRECONDITION_FAILED now that the Group Level is retired", () => {
    expect(() => setGroupLevelForMember()).toThrow(
      expect.objectContaining({
        code: "PRECONDITION_FAILED",
        message:
          "Groups no longer have their own level. Organizers of a football group adjust tier points instead.",
      }),
    );
  });

  it("refuses in Arabic", () => {
    expect(() => setGroupLevelForMember({ locale: "ar" })).toThrow(
      expect.objectContaining({ code: "PRECONDITION_FAILED" }),
    );
  });
});
