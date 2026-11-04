"use client";

import Link from "next/link";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { cn } from "~/lib/utils";

export function InviteAuthButtons({
  returnPath,
  className,
  fullWidth = false,
}: {
  returnPath: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const m = useMessages();
  const buttonClass = cn("min-h-11", fullWidth && "w-full sm:w-auto");

  return (
    <div className={className}>
      <Button className={buttonClass} asChild>
        <Link href={authCrossLinkUrl("/login", returnPath)}>
          {m.common.signIn}
        </Link>
      </Button>
      <Button variant="outline" className={buttonClass} asChild>
        <Link href={authCrossLinkUrl("/signup", returnPath)}>
          {m.webAuth.phoneAuth.createAccount}
        </Link>
      </Button>
    </div>
  );
}
