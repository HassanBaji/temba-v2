import { describe, expect, it } from "vitest";

import {
  createPaymentSummary,
  gamePaymentsTracked,
  paymentLineupGroups,
  paymentMark,
  paymentRowActionLabel,
  paymentRowActions,
  paymentRowSubline,
  paymentShortcuts,
  payersWhenFull,
  viewerPaymentCard,
  type PaymentLineupPlayer,
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

function player(
  name: string,
  overrides: Partial<PaymentLineupPlayer> = {},
): PaymentLineupPlayer {
  return {
    userId: name,
    name,
    image: null,
    isViewer: false,
    mark: "due",
    sideIndex: null,
    role: null,
    position: null,
    ...overrides,
  };
}

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
    expect(paymentRowActions("claimed", "claimed")).toEqual({
      primary: "confirm",
      canSendBack: true,
    });
    expect(paymentRowActions("due")).toEqual({
      primary: "mark_paid",
      canSendBack: false,
    });
    expect(paymentRowActions("paid", "paid")).toEqual({
      primary: "undo",
      canSendBack: false,
    });
  });

  it("keeps a free player's recorded payment within the Organizer's reach", () => {
    expect(paymentRowActions("free")).toEqual({
      primary: null,
      canSendBack: false,
    });
    expect(paymentRowActions("free", "paid")).toEqual({
      primary: "undo",
      canSendBack: false,
    });
    expect(paymentRowActions("free", "claimed")).toEqual({
      primary: null,
      canSendBack: true,
    });
  });

  it("labels each action", () => {
    expect(paymentRowActionLabel("confirm", "en")).toBe("Confirm");
    expect(paymentRowActionLabel("mark_paid", "en")).toBe("Mark paid");
    expect(paymentRowActionLabel("undo", "en")).toBe("Undo");
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
      note: expect.stringContaining("1.500 BD") as string,
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
  it("says when a player claimed and who confirmed", () => {
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
    expect(
      paymentRowSubline(
        {
          mark: "paid",
          status: "paid",
          claimedAt: null,
          paidBy: { isViewer: true, name: "Hassan" },
        },
        "en",
        NOW,
      ),
    ).toBe("Paid, confirmed by you");
    expect(
      paymentRowSubline(
        {
          mark: "paid",
          status: "paid",
          claimedAt: null,
          paidBy: { isViewer: false, name: "Noor" },
        },
        "en",
        NOW,
      ),
    ).toBe("Paid, confirmed by Noor");
  });

  it("keeps a free player's recorded payment in view", () => {
    expect(
      paymentRowSubline(
        { mark: "free", status: "paid", claimedAt: null },
        "en",
        NOW,
      ),
    ).toBe("Keeper, plays free. Already paid");
    expect(
      paymentRowSubline(
        { mark: "free", status: null, claimedAt: null },
        "en",
        NOW,
      ),
    ).toBe("Keeper, plays free");
  });
});

describe("paymentShortcuts", () => {
  const tally = { paid: 1, claimed: 2, due: 3, free: 0, payers: 6 };

  it("counts only who a reminder would reach", () => {
    expect(
      paymentShortcuts(tally, { toRemind: 2, remindedToday: 0 }, "en"),
    ).toEqual({
      confirmAll: { label: "Confirm all 2", enabled: true },
      remind: { label: "Remind 2", enabled: true },
    });
  });

  it("reads Reminded once today's reminders are out", () => {
    expect(
      paymentShortcuts(tally, { toRemind: 0, remindedToday: 3 }, "en").remind,
    ).toEqual({ label: "Reminded", enabled: false });
  });

  it("says so when only the Organizer has not paid, or nobody is left", () => {
    expect(
      paymentShortcuts(
        { ...tally, claimed: 0, due: 1 },
        { toRemind: 0, remindedToday: 0 },
        "en",
      ),
    ).toEqual({
      confirmAll: { label: "Nothing to confirm", enabled: false },
      remind: { label: "Nobody to remind", enabled: false },
    });
    expect(
      paymentShortcuts(
        { ...tally, due: 0 },
        { toRemind: 0, remindedToday: 0 },
        "en",
      ).remind.label,
    ).toBe("Everyone has paid");
  });
});

describe("paymentLineupGroups", () => {
  it("groups a football Game by bib with each side's paid count", () => {
    const groups = paymentLineupGroups(
      {
        format: "friendly_game",
        sides: [
          { sideIndex: 2, bib: "white" },
          { sideIndex: 1, bib: "black" },
        ],
        players: [
          player("Hamad", { sideIndex: 1, role: "keeper", mark: "free" }),
          player("Yousif", {
            sideIndex: 1,
            role: "outfield",
            position: "mid",
            mark: "claimed",
          }),
          player("Hassan", {
            sideIndex: 1,
            role: "outfield",
            position: "def",
            mark: "paid",
            isViewer: true,
          }),
          player("Bo", {
            sideIndex: 2,
            role: "keeper",
            position: "def",
            mark: "due",
          }),
        ],
      },
      "en",
    );
    expect(groups.map((group) => [group.title, group.paidLine])).toEqual([
      ["Black", "1 of 2 paid"],
      ["White", "0 of 1 paid"],
    ]);
    expect(
      groups[0]?.rows.map((row) => [row.displayName, row.subline]),
    ).toEqual([
      ["Hamad", "Keeper, plays free"],
      ["Yousif", "Midfield, says paid"],
      ["You", "Defender, paid"],
    ]);
    expect(groups[1]?.rows[0]?.subline).toBe("Keeper, not yet");
  });

  it("lists players on no side together", () => {
    const groups = paymentLineupGroups(
      {
        format: "friendly_game",
        sides: [],
        players: [player("Ali", { mark: "paid" }), player("Noor")],
      },
      "en",
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      title: "Players",
      paidLine: "1 of 2 paid",
    });
    expect(groups[0]?.rows[1]?.subline).toBe("not yet");
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
