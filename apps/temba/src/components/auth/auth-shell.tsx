import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0f0a1f] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
        >
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-600/40 blur-3xl" />
          <div className="absolute top-1/3 right-0 h-64 w-64 rounded-full bg-emerald-500/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <Link href="/" className="text-3xl font-bold tracking-tight text-white">
            Temba
          </Link>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Compete. Level up. Win.
          </h1>
          <p className="max-w-md text-lg text-white/70">
            Join the future of competitive sports — track games, climb ranks, and
            dominate your league.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/40">
          &copy; {new Date().getFullYear()} Temba
        </p>
      </div>

      <div className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-10 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 text-center lg:hidden">
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Temba
            </Link>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
