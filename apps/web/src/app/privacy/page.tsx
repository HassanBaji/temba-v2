import { type Metadata } from "next";

import { AuthScreen } from "~/components/auth/auth-screen";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <AuthScreen backHref="/" backLabel="Back" title="Privacy Policy">
      <p className="text-body text-muted-foreground">
        We&apos;re finalising this page. Check back soon.
      </p>
    </AuthScreen>
  );
}
