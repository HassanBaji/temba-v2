import { productDayKey } from "@repo/domain/product-timezone";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";

import {
  durationMinutes,
  minutesFromDayStart,
} from "~/components/schedule/booking-model";
import { draftStartsAt } from "~/components/schedule/new-booking-model";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type EditableBooking = {
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  priceFils: number;
  paymentStatus: string;
  managerNotes: string | null;
};

export type EditDraft = {
  courtId: string;
  day: string;
  startMinute: number;
  durationMinutes: number;
  /** Null while the price follows the Booking: kept, or repriced when it moves. */
  priceInput: string | null;
  notes: string;
};

export type UpdateInput = {
  bookingId: string;
  courtId?: string;
  startsAt?: Date;
  durationMinutes?: number;
  priceFils?: number;
  managerNotes?: string | null;
};

export function editDraftFrom(booking: EditableBooking): EditDraft {
  const day = productDayKey(booking.startsAt);
  return {
    courtId: booking.courtId,
    day,
    startMinute: minutesFromDayStart(day, booking.startsAt),
    durationMinutes: durationMinutes(booking),
    priceInput: null,
    notes: booking.managerNotes ?? "",
  };
}

/** A settled payment fixes the price; the API refuses to change it. */
export function priceLocked(booking: Pick<EditableBooking, "paymentStatus">) {
  return booking.paymentStatus !== "pending";
}

export function isMoved(booking: EditableBooking, draft: EditDraft) {
  const startsAt = draftStartsAt(draft.day, draft.startMinute);
  return (
    draft.courtId !== booking.courtId ||
    startsAt.getTime() !== booking.startsAt.getTime() ||
    draft.durationMinutes !== durationMinutes(booking)
  );
}

/** What the price field shows: the typed price, else the rate for a move, else the current price. */
export function shownPriceInput(
  booking: EditableBooking,
  draft: EditDraft,
  quotedFils: number | null,
): string {
  if (draft.priceInput !== null) {
    return draft.priceInput;
  }
  if (isMoved(booking, draft) && !priceLocked(booking)) {
    return filsToMajorInput(quotedFils);
  }
  return filsToMajorInput(booking.priceFils);
}

export type EditResult =
  | { ok: true; input: UpdateInput | null }
  | { ok: false; message: string };

/** Only what changed; `input` is null when nothing did. */
export function editToInput(
  bookingId: string,
  booking: EditableBooking,
  draft: EditDraft,
  quotedFils: number | null,
  locale: Locale,
): EditResult {
  const moved = isMoved(booking, draft);
  const input: UpdateInput = { bookingId };

  if (moved) {
    input.courtId = draft.courtId;
    input.startsAt = draftStartsAt(draft.day, draft.startMinute);
    input.durationMinutes = draft.durationMinutes;
  }

  if (priceLocked(booking)) {
    if (moved) {
      input.priceFils = booking.priceFils;
    }
  } else if (draft.priceInput !== null) {
    const parsed = parseOptionalPricePerPlayerFils(draft.priceInput, locale);
    if (!parsed.ok || parsed.fils === null) {
      return {
        ok: false,
        message: messagesFor(locale).consoleBookings.edit.badPrice,
      };
    }
    const unchanged = moved
      ? parsed.fils === quotedFils
      : parsed.fils === booking.priceFils;
    if (!unchanged) {
      input.priceFils = parsed.fils;
    }
  } else if (moved && quotedFils === null) {
    return {
      ok: false,
      message: messagesFor(locale).consoleBookings.edit.noRate,
    };
  }

  const notes = draft.notes.trim();
  if (notes !== (booking.managerNotes ?? "")) {
    input.managerNotes = notes || null;
  }

  return { ok: true, input: Object.keys(input).length > 1 ? input : null };
}
