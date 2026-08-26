import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "~/components/auth/auth-shell";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);
  const signUpUrl = redirectUrl
    ? `/signup?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/signup";

  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/login"
        signUpUrl={signUpUrl}
        forceRedirectUrl={redirectUrl ?? undefined}
        fallbackRedirectUrl={redirectUrl ?? "/dashboard"}
      />
    </AuthShell>
  );
}
