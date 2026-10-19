"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { initials } from "@repo/domain/initials";
import { cn } from "~/lib/utils";

type Holder =
  | { kind: "user"; name: string; image?: string | null }
  | { kind: "guest"; name: string; phone?: string };

/** The design's 28px monogram: ink for App Customers, a hairline outline for guests. */
export function BookingMonogram({
  holder,
  className,
}: {
  holder: Holder;
  className?: string;
}) {
  const label = holder.name || (holder.kind === "guest" ? holder.phone : "");
  const image = holder.kind === "user" ? holder.image : null;
  const tone =
    holder.kind === "user"
      ? "bg-ink text-paper"
      : "border-border bg-paper text-foreground border";
  return (
    <Avatar
      aria-hidden="true"
      className={cn("size-7 rounded-[7px]", tone, className)}
    >
      {image ? <AvatarImage alt="" src={image} /> : null}
      <AvatarFallback
        className={cn("rounded-[7px] text-[11px] font-semibold", tone)}
      >
        {initials(label ?? "")}
      </AvatarFallback>
    </Avatar>
  );
}
