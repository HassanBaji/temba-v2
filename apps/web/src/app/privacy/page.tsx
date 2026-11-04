import { type Metadata } from "next";

import { AuthScreen } from "~/components/auth/auth-screen";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webAuth.legal.privacyTitle };
}

export default async function PrivacyPage() {
  const m = await getRequestMessages();
  return (
    <AuthScreen
      backHref="/"
      backLabel={m.common.back}
      title={m.webAuth.legal.privacyTitle}
    >
      <p className="text-body text-muted-foreground">
        {m.webAuth.legal.privacyFinalising}
      </p>
    </AuthScreen>
  );
}
