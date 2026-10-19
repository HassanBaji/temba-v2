import { SignIn } from "@clerk/nextjs";

import { TembaWordmark } from "~/components/ui/temba-wordmark";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url) ?? "/";

  return (
    <main className="bg-wash flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2">
        <TembaWordmark />
        <p className="text-meta text-muted-foreground">
          Venue console. Sign in with the Temba account you play with.
        </p>
      </div>
      <SignIn routing="path" path="/login" forceRedirectUrl={redirectUrl} />
    </main>
  );
}
