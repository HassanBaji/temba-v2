"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { venuePath } from "~/lib/console-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { initials } from "@repo/domain/initials";

function courtsLabel(count: number) {
  return `${count} ${count === 1 ? "court" : "courts"}`;
}

export function VenueSwitcher({
  venueId,
  name,
  city,
  courtCount,
}: {
  venueId: string;
  name: string;
  city: string;
  courtCount: number;
}) {
  const venues = api.venues.listManaged.useQuery();
  const others = (venues.data ?? []).filter((venue) => venue.id !== venueId);

  const card = (
    <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
      <span className="bg-raised text-paper rounded-block flex size-[30px] shrink-0 items-center justify-center text-xs font-semibold">
        {initials(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className="text-dim block truncate text-[11px]">
          {courtsLabel(courtCount)}, {city}
        </span>
      </span>
    </span>
  );

  if (others.length === 0) {
    return (
      <div className="border-dimrule rounded-control mt-[26px] flex items-center gap-2.5 border px-2.5 py-3">
        {card}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "border-dimrule surface-ink rounded-control mt-[26px] flex w-full items-center gap-2.5 border px-2.5 py-3 text-left",
          "hover:bg-raised focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        )}
        aria-label="Switch Venue"
      >
        {card}
        <ChevronsUpDown
          aria-hidden="true"
          className="text-dim size-3.5 shrink-0"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[212px]">
        <DropdownMenuLabel>Your Venues</DropdownMenuLabel>
        <DropdownMenuItem disabled className="justify-between">
          {name}
          <Check aria-hidden="true" className="size-4" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {others.map((venue) => (
          <DropdownMenuItem key={venue.id} asChild>
            <Link href={venuePath(venue.id)}>{venue.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
