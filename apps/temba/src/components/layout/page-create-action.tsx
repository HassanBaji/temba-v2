import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

// Icon-only so the mobile top bar title keeps its width at 360px.
export function PageCreateAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button asChild variant="ghost" size="icon" className="size-11">
      <Link href={href} aria-label={label}>
        <PlusIcon aria-hidden="true" className="size-5" />
      </Link>
    </Button>
  );
}
