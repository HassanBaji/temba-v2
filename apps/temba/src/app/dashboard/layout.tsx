import "~/styles/globals.css";

import { HydrateClient } from "~/trpc/server";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <HydrateClient>
      <div className="text-foreground min-h-screen bg-white">{children}</div>
    </HydrateClient>
  );
}
