import { type Metadata } from "next";

import { AuthScreen } from "~/components/auth/auth-screen";

export const metadata: Metadata = {
  title: "Terms of Use",
};

export default function TermsPage() {
  return (
    <AuthScreen backHref="/" backLabel="Back" title="Terms of Use">
      <p className="text-body text-muted-foreground">
        We&apos;re finalising this page. Check back soon.
      </p>
    </AuthScreen>
  );
}
