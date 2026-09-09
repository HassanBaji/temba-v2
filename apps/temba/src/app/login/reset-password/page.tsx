import { ForgotPasswordForm } from "~/components/auth/forgot-password-form";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return <ForgotPasswordForm redirectUrl={redirectUrl} />;
}
