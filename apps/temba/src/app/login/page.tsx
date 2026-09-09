import { SignIn } from "@clerk/nextjs";

import { AuthScreen } from "~/components/auth/auth-screen";
import { authCompleteUrl, authCrossLinkUrl } from "~/lib/auth-redirect";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);
  const signUpUrl = authCrossLinkUrl("/signup", redirectUrl);

  return (
    <AuthScreen
      backHref={authCrossLinkUrl("/", redirectUrl)}
      backLabel="Back"
      crossLink={{ href: signUpUrl, label: "Create account" }}
      title="Sign in"
    >
      <SignIn
        routing="path"
        path="/login"
        signUpUrl={signUpUrl}
        forceRedirectUrl={redirectUrl ?? undefined}
        fallbackRedirectUrl={authCompleteUrl(redirectUrl)}
      />
    </AuthScreen>
  );
}
