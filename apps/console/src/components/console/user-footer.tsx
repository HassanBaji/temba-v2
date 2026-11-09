"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronsUpDown } from "lucide-react";

import { useLocaleSwitch, useMessages } from "~/components/locale-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { initials } from "@repo/domain/initials";
import { isLocale, LOCALE_LABELS, LOCALES } from "@repo/i18n/locale";

export function UserFooter({ webOrigin }: { webOrigin?: string }) {
  const m = useMessages().consoleShell.account;
  const { locale, setLocale, switching } = useLocaleSwitch();
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.fullName ?? user?.username ?? m.fallbackName;
  const role = user?.publicMetadata.operator === true ? m.operator : m.manager;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="surface-ink hover:bg-raised focus-visible:ring-ring/50 rounded-block mt-auto flex w-full items-center gap-2.5 p-2.5 text-start outline-none focus-visible:ring-[3px]"
        aria-label={m.label}
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
              <a href={webOrigin}>{m.backToTemba}</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuLabel>{m.language}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) => {
            if (isLocale(next) && next !== locale) {
              setLocale(next);
            }
          }}
        >
          {LOCALES.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              lang={option}
              disabled={switching}
            >
              {LOCALE_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void signOut({ redirectUrl: "/login" })}
        >
          {m.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
