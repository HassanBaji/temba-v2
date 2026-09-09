import { AuthScreen } from "~/components/auth/auth-screen";
import { SsoCallback } from "~/components/auth/sso-callback";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function LoginSsoCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return (
    <AuthScreen title="Signing in">
      <SsoCallback redirectUrl={redirectUrl} />
    </AuthScreen>
  );
}
