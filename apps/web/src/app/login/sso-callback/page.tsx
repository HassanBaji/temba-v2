import { AuthScreen } from "~/components/auth/auth-screen";
import { SsoCallback } from "~/components/auth/sso-callback";
import { getRequestMessages } from "~/lib/request-locale";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export default async function LoginSsoCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);
  const m = await getRequestMessages();

  return (
    <AuthScreen title={m.webAuth.sso.signingIn}>
      <SsoCallback redirectUrl={redirectUrl} />
    </AuthScreen>
  );
}
