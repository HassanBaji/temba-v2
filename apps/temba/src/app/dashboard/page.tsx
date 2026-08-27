import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  return (
    <DashboardShell title="Home">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Home</h2>
          <p className="text-muted-foreground text-sm">
            Your Temba dashboard. Browse the Directory or open Groups &amp;
            Communities from the sidebar.
          </p>
        </div>
        {/* Temporary until Groups & Communities hub CTA lands */}
        <Button variant="outline" asChild>
          <Link href="/dashboard/directory">Directory</Link>
        </Button>
      </div>
    </DashboardShell>
  );
}
