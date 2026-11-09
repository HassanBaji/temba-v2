import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { Button } from "~/components/ui/button";
import { getRequestMessages } from "~/lib/request-locale";

export default async function NotFound() {
  const m = (await getRequestMessages()).consoleShell.notFound;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        title={m.title}
        description={m.description}
        action={
          <Button asChild variant="outline">
            <Link href="/">{m.yourVenues}</Link>
          </Button>
        }
      />
    </main>
  );
}
