import Link from "next/link";

import { Card } from "~/components/ui/card";
import { pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

export function InviteShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-background flex min-h-svh items-center justify-center py-10",
        pageGutterX,
      )}
    >
      <div className="max-w-content mx-auto w-full space-y-6">
        <div className="text-center">
          <Link
            href="/"
            className="text-foreground text-h2 font-bold tracking-[-0.02em]"
          >
            Temba
          </Link>
        </div>
        <Card
          variant="elevated"
          className={cn("mx-auto w-full", wide ? "max-w-content" : "max-w-md")}
        >
          {children}
        </Card>
      </div>
    </div>
  );
}
