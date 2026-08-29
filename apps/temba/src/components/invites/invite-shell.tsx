import Link from "next/link";

import { Card } from "~/components/ui/card";
import { pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

export function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "bg-background flex min-h-svh items-center justify-center py-10",
        pageGutterX,
      )}
    >
      <div className="mx-auto w-full max-w-[var(--container-content)] space-y-6">
        <div className="text-center">
          <Link
            href="/"
            className="text-foreground text-h2 font-bold tracking-[-0.02em]"
          >
            Temba
          </Link>
          <p className="text-body text-muted-foreground mt-2">
            Sign in with Clerk to continue. Temba does not log you in itself.
          </p>
        </div>
        <Card variant="elevated" className="mx-auto w-full max-w-md">
          {children}
        </Card>
      </div>
    </div>
  );
}
