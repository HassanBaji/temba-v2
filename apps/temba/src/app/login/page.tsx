import { AuthScreen } from "~/components/auth/auth-screen";
import { SignInForm } from "~/components/auth/sign-in-form";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
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
      description="Use the number your groups know you by."
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-meta text-muted-foreground">Invited to a group?</p>
          <p className="text-meta font-semibold underline">Open the link</p>
        </div>
      }
    >
      <SignInForm redirectUrl={redirectUrl} />
    </AuthScreen>
  );
}
