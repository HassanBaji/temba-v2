import Link from "next/link";

import { Card } from "~/components/ui/card";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background grid min-h-svh lg:grid-cols-2">
      <aside className="bg-foreground relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <Link
          href="/"
          className="text-background text-title font-semibold tracking-[-0.01em]"
        >
          Temba
        </Link>
        <div className="space-y-4">
          <p className="text-display text-background font-bold tracking-[-0.02em]">
            Compete. Level up. Win.
          </p>
          <p className="text-lead text-background max-w-md">
            Join the future of competitive sports — track games, climb ranks,
            and dominate your league.
          </p>
          <span
            aria-hidden="true"
            className="bg-brand-on-dark mt-6 block size-12"
          />
        </div>
        <p className="text-background text-meta">
          © {new Date().getFullYear()} Temba
        </p>
      </aside>

      <div className="flex flex-col items-center justify-center px-4 py-10 md:px-6">
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
