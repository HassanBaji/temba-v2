import { SearchX } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { InviteShell } from "~/components/invites/invite-shell";
import { Button } from "~/components/ui/button";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.common.pageNotFound };
}

export default async function NotFound() {
  const m = await getRequestMessages();
  return (
    <InviteShell>
      <EmptyState
        icon={SearchX}
        headingLevel={1}
        title={m.common.pageNotFound}
        description={m.webAuth.notFound.description}
        action={
          <Button asChild>
            <Link href="/">{m.webAuth.notFound.goToTemba}</Link>
          </Button>
        }
      />
    </InviteShell>
  );
}
