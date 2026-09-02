import Link from "next/link";

import { Card } from "~/components/ui/card";
import { pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background grid min-h-svh lg:grid-cols-2">
      <aside className="bg-primary relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <Link
          href="/"
          className="text-primary-foreground text-title font-semibold tracking-[-0.01em]"
        >
          Temba
        </Link>
        <div className="space-y-4">
          <p className="text-display text-primary-foreground font-bold tracking-[-0.02em]">
            Compete. Level up. Win.
          </p>
          <p className="text-lead text-primary-foreground max-w-md">
            Join the future of competitive sports — track games, climb ranks,
            and dominate your league.
          </p>
          <span aria-hidden="true" className="bg-volt mt-6 block size-12" />
        </div>
        <p className="text-primary-foreground text-meta">
          © {new Date().getFullYear()} Temba
        </p>
      </aside>

      <div
        className={cn(
          "flex flex-col items-center justify-center py-10",
          pageGutterX,
        )}
      >
        <div className="mb-8 text-center lg:hidden">
          <Link
            href="/"
            className="text-foreground text-h2 font-bold tracking-[-0.02em]"
          >
            Temba
          </Link>
        </div>
        <Card variant="elevated" className="w-full max-w-md">
          {children}
        </Card>
      </div>
    </div>
  );
}
