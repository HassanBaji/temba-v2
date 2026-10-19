"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { initials } from "@repo/domain/initials";

export function UserFooter({ webOrigin }: { webOrigin?: string }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.fullName ?? user?.username ?? "You";
  const role = user?.publicMetadata.operator === true ? "Operator" : "Manager";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="surface-ink hover:bg-raised focus-visible:ring-ring/50 rounded-block mt-auto flex w-full items-center gap-2.5 p-2.5 text-left outline-none focus-visible:ring-[3px]"
        aria-label="Account"
      >
        <span className="border-dimrule rounded-block flex size-[30px] shrink-0 items-center justify-center border text-xs font-semibold">
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px]">{name}</span>
          <span className="text-dim block text-[11px]">{role}</span>
        </span>
        <ChevronsUpDown
          aria-hidden="true"
          className="text-dim size-3.5 shrink-0"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[212px]">
        {webOrigin ? (
          <>
            <DropdownMenuItem asChild>
              <a href={webOrigin}>Back to Temba</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          onSelect={() => void signOut({ redirectUrl: "/login" })}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
