import { SignUp } from "@clerk/nextjs";

import { AuthScreen } from "~/components/auth/auth-screen";
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
    <AuthScreen
      backHref={authCrossLinkUrl("/", redirectUrl)}
      backLabel="Back"
      crossLink={{ href: signInUrl, label: "Sign in" }}
      title="Create account"
    >
      <SignUp
        routing="path"
        path="/signup"
        signInUrl={signInUrl}
        forceRedirectUrl={redirectUrl ?? undefined}
        fallbackRedirectUrl={authCompleteUrl(redirectUrl)}
      />
    </AuthScreen>
  );
}
