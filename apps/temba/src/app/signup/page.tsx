import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "~/components/auth/auth-shell";
import { authCompleteUrl, authCrossLinkUrl } from "~/lib/auth-redirect";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);
  const signInUrl = authCrossLinkUrl("/login", redirectUrl);

  return (
    <AuthShell>
      <SignUp
        routing="path"
        path="/signup"
        signInUrl={signInUrl}
        forceRedirectUrl={redirectUrl ?? undefined}
        fallbackRedirectUrl={authCompleteUrl(redirectUrl)}
      />
    </AuthShell>
  );
}
