"use client";

import Link from "next/link";

import { AuthScreen } from "~/components/auth/auth-screen";
import { LanguageToggle } from "~/components/common/language-toggle";
import { useMessages } from "~/components/locale-provider";
import { TembaWordmark } from "~/components/ui/temba-wordmark";

export function InviteShell({
  children,
  wide = false,
  tone = "paper",
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** A Game link reads as the Game itself, on the ink page (design "Join via link" 3a). */
  tone?: "paper" | "ink";
}) {
  const m = useMessages();
  if (tone === "ink") {
    return (
      <AuthScreen variant="welcome" padContent={false}>
        <div className="max-w-column mx-auto flex w-full flex-1 flex-col px-[26px]">
          <header className="flex items-center justify-between pb-5 pt-[22px]">
            <Link
              href="/"
              aria-label={m.common.goHome}
              className="focus-visible:ring-on-focus/40 rounded-md outline-none focus-visible:ring-[3px]"
            >
              <TembaWordmark surface="ink" />
            </Link>
            <LanguageToggle />
          </header>
          {children}
        </div>
      </AuthScreen>
    );
  }
  return (
    <AuthScreen brand wide={wide}>
      {children}
    </AuthScreen>
  );
}
