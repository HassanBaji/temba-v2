import Link from "next/link";

import { Button } from "~/components/ui/button";

export function AcceptTeamEmailInvite() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-white">Invite unavailable</h1>
      <p className="text-sm text-white/70">
        Team Email invite is gone. Use a Lookup invite or a live Invite link.
      </p>
      <Button variant="outline" asChild>
        <Link href="/login">Go to login</Link>
      </Button>
    </div>
  );
}
