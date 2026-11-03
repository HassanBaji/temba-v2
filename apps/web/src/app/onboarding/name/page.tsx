import { type Metadata } from "next";

import { NameTask } from "~/components/onboarding/name-task";
import { profileChecklistHref } from "~/lib/onboarding-step";
import { getRequestMessages } from "~/lib/request-locale";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webAuth.onboarding.name.title };
}

export default async function NameTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const backHref = profileChecklistHref(
    safeInternalRedirect(params.redirect_url),
  );

  return <NameTask backHref={backHref} />;
}
