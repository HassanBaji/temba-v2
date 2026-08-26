import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "~/components/auth/auth-shell";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);
  const signInUrl = redirectUrl
    ? `/login?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/login";

  return (
    <AuthShell>
      <SignUp
        routing="path"
        path="/signup"
        signInUrl={signInUrl}
        forceRedirectUrl={redirectUrl ?? undefined}
        fallbackRedirectUrl={redirectUrl ?? "/dashboard"}
      />
    </AuthShell>
  );
}
