"use client";

import Link from "next/link";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

/** The pinned column under a Profile task: one primary, then the way out. */
export function TaskActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto flex flex-col gap-2.5 pt-6">{children}</div>;
}

export function NotNowLink({
  href,
  disabled,
}: {
  href: string;
  disabled?: boolean;
}) {
  const m = useMessages();
  return (
    <Button
      asChild
      variant="link"
      className="text-muted-foreground min-h-11 underline"
      disabled={disabled}
    >
      <Link href={href}>{m.webAuth.onboarding.notNow}</Link>
    </Button>
  );
}
