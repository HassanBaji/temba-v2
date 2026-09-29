import { SearchX } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { InviteShell } from "~/components/invites/invite-shell";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <InviteShell>
      <EmptyState
        icon={SearchX}
        headingLevel={1}
        title="Page not found"
        description="This page does not exist or is no longer available."
        action={
          <Button asChild>
            <Link href="/">Go to Temba</Link>
          </Button>
        }
      />
    </InviteShell>
  );
}
