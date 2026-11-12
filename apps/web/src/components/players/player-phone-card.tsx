"use client";

import { Phone } from "lucide-react";

import { useMessages } from "~/components/locale-provider";
import { displayPhone } from "@repo/domain/phone-number";

/** A Group approver's way to call a member of one of their Groups (ADR-0078). */
export function PlayerPhoneCard({
  name,
  phoneNumber,
}: {
  name: string;
  phoneNumber: string;
}) {
  const m = useMessages();
  const page = m.profile.playerPage;
  const phone = displayPhone(phoneNumber);
  return (
    <a
      href={`tel:${phoneNumber}`}
      aria-label={page.callPhone(name, phone)}
      className="border-rule rounded-card bg-paper hover:bg-wash flex items-center gap-3.5 border px-[18px] py-3.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-current"
    >
      <Phone aria-hidden="true" className="size-[18px] shrink-0" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-eyebrow text-muted-foreground">
          {page.phoneLabel}
        </span>
        <span dir="ltr" className="text-body font-semibold tabular-nums">
          {phone}
        </span>
        <span className="text-eyebrow text-muted-foreground">
          {page.phoneNote}
        </span>
      </span>
    </a>
  );
}
