import { describe, expect, it } from "vitest";

import {
  createPaymentSummary,
  formatPaymentFigure,
  gamePaymentsTracked,
  paymentMark,
  paymentRowActions,
  paymentRowSubline,
  paymentTally,
  payersWhenFull,
  playsFree,
  viewerPaymentCard,
  type ViewerPayment,
} from "./game-payments";

const NOW = new Date("2026-11-13T13:00:00Z");

const due: ViewerPayment = {
  status: null,
  free: false,
  claimedAt: null,
  paidAt: null,
  returnedAt: null,
  returnReason: null,
  returnNote: null,
};

describe("gamePaymentsTracked", () => {
  it("needs both the switch and a price above zero", () => {
    expect(
      gamePaymentsTracked({ trackPayments: true, pricePerPlayerFils: 1500 }),
    ).toBe(true);
    expect(
      gamePaymentsTracked({ trackPayments: true, pricePerPlayerFils: 0 }),
    ).toBe(false);
    expect(
      gamePaymentsTracked({ trackPayments: true, pricePerPlayerFils: null }),
    ).toBe(false);
    expect(
      gamePaymentsTracked({ trackPayments: false, pricePerPlayerFils: 1500 }),
    ).toBe(false);
  });
});

describe("playsFree", () => {
  it("follows the keeper spot only when keepers play free", () => {
    expect(
      playsFree({ keepersPlayFree: true }, { footballRole: "keeper" }),
    ).toBe(true);
    expect(
      playsFree({ keepersPlayFree: true }, { footballRole: "outfield" }),
    ).toBe(false);
    expect(
      playsFree({ keepersPlayFree: false }, { footballRole: "keeper" }),
    ).toBe(false);
  });
});

describe("paymentMark", () => {
  it("never counts a claim or a sent-back payment as paid", () => {
    expect(paymentMark("claimed", false)).toBe("claimed");
    expect(paymentMark("not_received", false)).toBe("due");
    expect(paymentMark(null, false)).toBe("due");
    expect(paymentMark("paid", false)).toBe("paid");
  });

  it("marks a free player free even with a recorded payment", () => {
    expect(paymentMark("paid", true)).toBe("free");
  });
});

describe("paymentTally", () => {
  it("leaves free players out of the money expected", () => {
    const tally = paymentTally(
      ["paid", "paid", "claimed", "due", "free", "free"],
      1500,
    );
    expect(tally).toEqual({
      paid: 2,
      claimed: 1,
      due: 1,
      free: 2,
      payers: 4,
      collectedFils: 3000,
      expectedFils: 6000,
    });
  });
});

describe("payersWhenFull", () => {
  it("drops the two keepers when they play free", () => {
    expect(payersWhenFull({ playersAllowed: 14, keepersPlayFree: true })).toBe(
      12,
    );
    expect(payersWhenFull({ playersAllowed: 14, keepersPlayFree: false })).toBe(
      14,
    );
  });
});

describe("paymentRowActions", () => {
  it("offers confirm and send back on a claim", () => {
    expect(paymentRowActions("claimed")).toEqual({
      primary: "confirm",
      canSendBack: true,
    });
    expect(paymentRowActions("due")).toEqual({
      primary: "mark_paid",
      canSendBack: false,
    });
    expect(paymentRowActions("paid")).toEqual({
      primary: "undo",
      canSendBack: false,
    });
    expect(paymentRowActions("free")).toEqual({
      primary: null,
      canSendBack: false,
    });
  });
});

describe("viewerPaymentCard", () => {
  it("reads each state", () => {
    expect(viewerPaymentCard(due, 1500, "en", NOW).kind).toBe("due");
    expect(
      viewerPaymentCard(
        {
          ...due,
          status: "claimed",
          claimedAt: new Date("2026-11-13T12:50:00Z"),
        },
        1500,
        "en",
        NOW,
      ),
    ).toMatchObject({ kind: "claimed", title: "You said you paid" });
    expect(
      viewerPaymentCard({ ...due, free: true }, 1500, "en", NOW),
    ).toMatchObject({
      kind: "free",
      note: expect.stringContaining("1.500 BD"),
    });
  });

  it("quotes the Organizer's note over the reason", () => {
    const card = viewerPaymentCard(
      {
        ...due,
        status: "not_received",
        returnedAt: NOW,
        returnReason: "wrong_amount",
        returnNote: "Only 1 BD came through",
      },
      1500,
      "en",
      NOW,
    );
    expect(card).toMatchObject({ kind: "returned" });
    expect(card.kind === "returned" && card.note).toContain(
      "Only 1 BD came through",
    );
  });

  it("falls back to the reason without a note", () => {
    const card = viewerPaymentCard(
      {
        ...due,
        status: "not_received",
        returnedAt: NOW,
        returnReason: "nothing_arrived",
      },
      1500,
      "en",
      NOW,
    );
    expect(card.kind === "returned" && card.note).toContain(
      "Nothing has arrived",
    );
  });
});

describe("paymentRowSubline", () => {
  it("says when a player claimed", () => {
    expect(
      paymentRowSubline(
        {
          mark: "claimed",
          status: "claimed",
          claimedAt: new Date("2026-11-13T12:35:00Z"),
        },
        "en",
        NOW,
      ),
    ).toBe("Says they paid, 25 min ago");
    expect(
      paymentRowSubline(
        { mark: "due", status: "not_received", claimedAt: null },
        "en",
        NOW,
      ),
    ).toBe("Not received");
  });
});

describe("createPaymentSummary", () => {
  it("leaves keepers out of a football Game's total", () => {
    expect(
      createPaymentSummary(
        {
          priceFils: 1500,
          playersAllowed: 14,
          football: true,
          keepersPlayFree: true,
        },
        "en",
      ),
    ).toEqual({
      totalFils: 18000,
      note: "12 players at 1.500 BD. The keepers play free.",
    });
  });

  it("ignores the keepers switch on padel", () => {
    expect(
      createPaymentSummary(
        {
          priceFils: 2000,
          playersAllowed: 4,
          football: false,
          keepersPlayFree: true,
        },
        "en",
      ).totalFils,
    ).toBe(8000);
  });
});

describe("formatPaymentFigure", () => {
  it("keeps three decimals", () => {
    expect(formatPaymentFigure(18000)).toBe("18.000");
    expect(formatPaymentFigure(1500)).toBe("1.500");
  });
});
