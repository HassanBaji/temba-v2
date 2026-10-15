"use client";

import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

import { BookingDetails } from "./booking-details";

export function BookingSheet({
  venueId,
  bookingId,
  onClose,
}: {
  venueId: string;
  bookingId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={bookingId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-xl">
        <SheetHeader className="p-0">
          <SheetTitle>Booking</SheetTitle>
          <SheetDescription>
            {bookingId ? (
              <Link
                href={`/dashboard/manage/${venueId}/bookings/${bookingId}`}
                className="underline underline-offset-4"
              >
                Open full page
              </Link>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        {bookingId ? <BookingDetails bookingId={bookingId} /> : null}
      </SheetContent>
    </Sheet>
  );
}
