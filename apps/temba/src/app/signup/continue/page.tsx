import { AuthScreen } from "~/components/auth/auth-screen";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function SignupContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return (
    <AuthScreen
      backHref={authCrossLinkUrl("/signup", redirectUrl)}
      backLabel="Back"
      title="Continue"
    >
      <p className="text-body text-muted-foreground">
        A few more details are needed to finish your account.
      </p>
    </AuthScreen>
  );
}
