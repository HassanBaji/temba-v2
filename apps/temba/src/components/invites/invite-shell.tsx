import Link from "next/link";

export function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-white"
          >
            Temba
          </Link>
          <p className="mt-2 text-sm text-white/60">
            Sign in with Clerk to continue. Temba does not log you in itself.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
