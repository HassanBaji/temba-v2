import {
  priceForInterval,
  type PricingRuleInput,
} from "@repo/domain/booking-price";
import { parseOptionalPricePerPlayerFils } from "@repo/domain/price-per-player";

import { dayStart, weekdayOf, type GridWindow } from "./booking-model";

const MS_PER_MINUTE = 60_000;

export type HolderDraft =
  | { kind: "none" }
  | { kind: "user"; userId: string; name: string; detail: string | null }
  | { kind: "guest"; name: string; phone: string };

export type PaymentChoice = "later" | "paid" | "waived";

export type ManualMethod = "cash" | "card" | "benefit" | "transfer";

export type NewBookingDraft = {
  holder: HolderDraft;
  courtId: string;
  day: string;
  startMinute: number | null;
  durationMinutes: number;
  /** Null while the price follows the Pricing rules. */
  priceInput: string | null;
  payment: PaymentChoice;
  method: ManualMethod;
  reference: string;
  notes: string;
};

export type OpeningWindow = GridWindow & { weekday: number };

/**
 * Grid starts that leave at least one step before closing. A window opened
 * the day before that runs past midnight is not listed here; it belongs to
 * the day it opened on, like the day grid.
 */
export function startOptions(args: {
  day: string;
  openingHours: readonly OpeningWindow[];
  slotMinutes: number;
}): number[] {
  const weekday = weekdayOf(args.day);
  const starts = new Set<number>();
  for (const window of args.openingHours) {
    if (window.weekday !== weekday) {
      continue;
    }
    for (
      let minute = window.opensAtMinutes;
      minute + args.slotMinutes <= window.closesAtMinutes;
      minute += args.slotMinutes
    ) {
      starts.add(minute);
    }
  }
  return [...starts].sort((a, b) => a - b);
}

export function draftStartsAt(day: string, startMinute: number): Date {
  return new Date(dayStart(day).getTime() + startMinute * MS_PER_MINUTE);
}

/** The price the rules give the draft's interval, or null when no rule covers its start. */
export function quotedPriceFils(
  rules: readonly PricingRuleInput[],
  draft: Pick<
    NewBookingDraft,
    "courtId" | "day" | "startMinute" | "durationMinutes"
  >,
): number | null {
  if (draft.startMinute === null || !draft.courtId) {
    return null;
  }
  const startsAt = draftStartsAt(draft.day, draft.startMinute);
  const price = priceForInterval(rules, {
    courtId: draft.courtId,
    startsAt,
    endsAt: new Date(
      startsAt.getTime() + draft.durationMinutes * MS_PER_MINUTE,
    ),
  });
  return "fils" in price ? price.fils : null;
}

export type CreateForVenueInput = {
  venueId: string;
  courtId: string;
  startsAt: Date;
  durationMinutes: number;
  holder: { userId: string } | { guestName: string; guestPhone: string };
  priceFils?: number;
  payment?: {
    status: "paid" | "waived";
    method?: ManualMethod;
    reference?: string;
  };
  managerNotes?: string;
};

export type DraftResult =
  | { ok: true; input: CreateForVenueInput }
  | { ok: false; message: string };

export function draftToInput(
  venueId: string,
  draft: NewBookingDraft,
  quotedFils: number | null,
): DraftResult {
  const holder =
    draft.holder.kind === "user"
      ? { userId: draft.holder.userId }
      : draft.holder.kind === "guest"
        ? {
            guestName: draft.holder.name.trim(),
            guestPhone: draft.holder.phone.trim(),
          }
        : null;
  if (!holder) {
    return { ok: false, message: "Pick a Customer or add a new one" };
  }
  if ("guestName" in holder && (!holder.guestName || !holder.guestPhone)) {
    return { ok: false, message: "A new Customer needs a name and a phone" };
  }
  if (!draft.courtId) {
    return { ok: false, message: "Pick a Court" };
  }
  if (draft.startMinute === null) {
    return { ok: false, message: "Pick a start time" };
  }

  let priceFils: number | undefined;
  if (draft.priceInput !== null) {
    const parsed = parseOptionalPricePerPlayerFils(draft.priceInput);
    if (!parsed.ok || parsed.fils === null) {
      return { ok: false, message: "Enter the price in BD, like 18.000" };
    }
    priceFils = parsed.fils;
  } else if (quotedFils === null) {
    return { ok: false, message: "No rate covers this time. Type a price" };
  }

  const reference = draft.reference.trim();
  const notes = draft.notes.trim();
  return {
    ok: true,
    input: {
      venueId,
      courtId: draft.courtId,
      startsAt: draftStartsAt(draft.day, draft.startMinute),
      durationMinutes: draft.durationMinutes,
      holder,
      ...(priceFils !== undefined && priceFils !== quotedFils
        ? { priceFils }
        : {}),
      ...(draft.payment === "later"
        ? {}
        : {
            payment: {
              status: draft.payment,
              ...(draft.payment === "paid"
                ? { method: draft.method, reference: reference || undefined }
                : {}),
            },
          }),
      ...(notes ? { managerNotes: notes } : {}),
    },
  };
}

/** A search typed as digits becomes the new Customer's phone, else their name. */
export function guestFromQuery(query: string): { name: string; phone: string } {
  const trimmed = query.trim();
  return /^\+?[\d\s()-]{6,}$/.test(trimmed)
    ? { name: "", phone: trimmed }
    : { name: trimmed, phone: "" };
}
