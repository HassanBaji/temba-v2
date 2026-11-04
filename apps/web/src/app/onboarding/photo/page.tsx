import { type Metadata } from "next";

import { PhotoTask } from "~/components/onboarding/photo-task";
import { profileChecklistHref } from "~/lib/onboarding-step";
import { getRequestMessages } from "~/lib/request-locale";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webAuth.onboarding.photo.title };
}

export default async function PhotoTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const backHref = profileChecklistHref(
    safeInternalRedirect(params.redirect_url),
  );

  return <PhotoTask backHref={backHref} />;
}
