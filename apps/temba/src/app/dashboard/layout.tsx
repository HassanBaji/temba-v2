import "~/styles/globals.css";

import { HydrateClient } from "~/trpc/server";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <HydrateClient>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        {children}
      </div>
    </HydrateClient>
  );
}
