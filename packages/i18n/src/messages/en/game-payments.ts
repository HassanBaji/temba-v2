import { plural } from "../../plural";

export const gamePayments = {
  create: {
    trackTitle: "Track payments",
    trackDescription: "See who has paid their share",
    keepersTitle: "Keepers don’t pay",
    keepersDescription: "Whoever takes a keeper spot plays free",
    whoPays: "Who pays",
    toCollect: "To collect when it’s full",
    notTracked: "Turn on Track payments to see who has paid.",
    summary: (payers: number, price: string) =>
      plural("en", payers, {
        one: `{n} player at ${price}.`,
        other: `{n} players at ${price}.`,
      }),
    summaryKeepersFree: (payers: number, price: string) =>
      plural("en", payers, {
        one: `{n} player at ${price}. The keepers play free.`,
        other: `{n} players at ${price}. The keepers play free.`,
      }),
    summaryKeepersPay: (payers: number, price: string) =>
      plural("en", payers, {
        one: `{n} player at ${price}, keepers included.`,
        other: `{n} players at ${price}, keepers included.`,
      }),
    reviewLabel: "Payments",
    reviewTracked: "Tracked",
    reviewTrackedKeepersFree: "Tracked, keepers free",
    reviewNotTracked: "Not tracked",
  },
  mark: {
    paid: "paid",
    claimed: "says paid",
    due: "not yet",
    free: "doesn’t pay",
  },
  member: {
    title: "Payment",
    each: (price: string) => `${price} each`,
    dueTitle: "Not paid yet",
    dueHint: "Pay the organizer directly",
    claimAction: "I’ve paid",
    noMoneyNote:
      "Temba doesn’t collect the money. This only keeps track of who has paid.",
    claimedTitle: "You said you paid",
    claimedHint: (when: string) =>
      `${when}. Waiting for the organizer to confirm`,
    undoPrompt: "Changed your mind?",
    undoAction: "Undo, I haven’t paid",
    paidTitle: "Paid",
    paidHint: (when: string) => `Confirmed by the organizer, ${when}`,
    returnedTitle: "Not received yet",
    returnedHint: "The organizer hasn’t received your payment",
    returnedNote: (note: string, when: string) =>
      `“${note}” From the organizer, ${when}`,
    freeTitle: "Nothing to pay",
    freeHint: "You’re in goal. Keepers play free in this game",
    freeNote: (price: string) =>
      `If you swap to an outfield spot before kick-off, your share becomes ${price}, and whoever takes the gloves stops owing.`,
  },
  claimSheet: {
    title: "I’ve paid",
    description:
      "Tell the organizer you’ve paid your share. They confirm it when they have the money.",
    amount: "Amount",
    to: "To",
    organizer: "The organizer",
    note: "The organizer confirms once they have the money. You can undo this until then.",
    submit: "Tell the organizer I’ve paid",
  },
  organizer: {
    title: "Payments",
    collectedOf: (currency: string, total: string) =>
      `${currency} in, of ${total}`,
    confirmed: (n: number) =>
      plural("en", n, { one: "{n} confirmed", other: "{n} confirmed" }),
    claimed: (n: number) =>
      plural("en", n, {
        one: "{n} says they paid",
        other: "{n} say they paid",
      }),
    due: (n: number) =>
      plural("en", n, { one: "{n} not yet", other: "{n} not yet" }),
    free: (n: number) =>
      plural("en", n, { one: "{n} keeper, free", other: "{n} keepers, free" }),
    confirmAll: (n: number) =>
      plural("en", n, { one: "Confirm {n}", other: "Confirm all {n}" }),
    nothingToConfirm: "Nothing to confirm",
    remind: (n: number) =>
      plural("en", n, { one: "Remind {n}", other: "Remind {n}" }),
    reminded: "Reminded",
    nobodyToRemind: "Nobody to remind",
    everyonePaid: "Everyone has paid",
    players: "Players",
    rowPaid: "Paid",
    rowPaidByYou: "Paid, confirmed by you",
    rowPaidBy: (name: string) => `Paid, confirmed by ${name}`,
    rowClaimed: (when: string) => `Says they paid, ${when}`,
    rowDue: "Not paid yet",
    rowReturned: "Not received",
    rowFree: "Keeper, plays free",
    rowFreePaid: "Keeper, plays free. Already paid",
    rowFreeClaimed: "Keeper, plays free. Says they paid",
    confirm: "Confirm",
    markPaid: "Mark paid",
    undo: "Undo",
    notReceived: "Not received",
    footnote:
      "Confirm turns a claim into paid. The cross sends it back to the player as not received. Mark paid is for money you already have. Any group admin sees and can do the same.",
    loadFailed: "Couldn’t load payments",
    toast: {
      confirmed: "Payment confirmed",
      markedPaid: "Marked paid",
      undone: "Back to not paid",
      sentBack: "Sent back to the player",
      reminded: (n: number) =>
        plural("en", n, {
          one: "Reminded {n} player",
          other: "Reminded {n} players",
        }),
      confirmedAll: (n: number) =>
        plural("en", n, {
          one: "Confirmed {n} payment",
          other: "Confirmed {n} payments",
        }),
    },
  },
  notReceivedSheet: {
    title: "Not received?",
    claimedAgo: (name: string, when: string) =>
      `${name} said they paid, ${when}.`,
    why: "Tell them why (optional)",
    reasons: {
      nothing_arrived: "Nothing has arrived",
      wrong_amount: "Wrong amount",
      sent_elsewhere: "Sent to someone else",
    },
    noteLabel: "Add a note",
    cancel: "Cancel",
    submit: "Mark not received",
  },
  memberToast: {
    claimed: "Sent to the organizer",
    undone: "Undone",
  },
  lineup: {
    more: (n: number) =>
      plural("en", n, { one: "{n} more", other: "{n} more" }),
    players: "Players",
    keeper: "Keeper",
    keeperFree: "Keeper, plays free",
    positionAndMark: (position: string, mark: string) => `${position}, ${mark}`,
    manage: "Confirm and mark payments",
    paidCount: (paid: number, payers: number) => `${paid} of ${payers} paid`,
  },
  errors: {
    notTracked: "This game doesn’t track payments",
    needsPrice: "Set a price to track payments",
    notPlayer: "Only players in this game pay",
    nothingToPay: "You have nothing to pay in this game",
    alreadyPaid: "Already confirmed as paid",
    notClaimed: "This player hasn’t said they paid",
    notPaid: "This payment isn’t confirmed",
  },
};
