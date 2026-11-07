import { describe, expect, it } from "vitest";

import {
  requestsQueueHeading,
  seatHoldRemainingLabel,
  seatHoldRequestRowMeta,
} from "./seat-hold-request";

const NOW = new Date("2026-11-09T10:00:00Z");

describe("Seat hold request rows", () => {
  it("counts down the hold in hours, then minutes, then nothing", () => {
    expect(
      seatHoldRemainingLabel(new Date("2026-11-10T07:30:00Z"), "en", NOW),
    ).toBe("held 21h");
    expect(
      seatHoldRemainingLabel(new Date("2026-11-09T10:40:00Z"), "en", NOW),
    ).toBe("held 40 min");
    expect(seatHoldRemainingLabel(NOW, "en", NOW)).toBeNull();
    expect(seatHoldRemainingLabel(null, "en", NOW)).toBeNull();
  });

  it("writes the row meta with the Group, the link and the hold", () => {
    expect(
      seatHoldRequestRowMeta(
        {
          id: "r1",
          createdAt: NOW,
          seatHeldUntil: new Date("2026-11-10T07:30:00Z"),
          user: { id: "u1", name: "Hassan Haji", image: null },
          invitedBy: { id: "u2", name: "Yousif Kadhem" },
          groupName: "Gooz of Arad",
          levelTenths: 24,
          provisional: false,
        },
        "en",
        NOW,
      ),
    ).toBe(
      "2.4 · Wants the seat and to join Gooz of Arad · Came through Yousif Kadhem's link · held 21h · Requested today",
    );
  });

  it("heads the queue by what is waiting", () => {
    expect(requestsQueueHeading({ levelRange: 0, seatHolds: 0 }, "en")).toBe(
      "No requests waiting.",
    );
    expect(requestsQueueHeading({ levelRange: 1, seatHolds: 0 }, "en")).toBe(
      "1 waiting",
    );
    expect(requestsQueueHeading({ levelRange: 1, seatHolds: 1 }, "en")).toBe(
      "2 waiting, seats held",
    );
  });
});
