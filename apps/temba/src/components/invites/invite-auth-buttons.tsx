import Link from "next/link";

import { Button } from "~/components/ui/button";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { cn } from "~/lib/utils";

export function InviteAuthButtons({
  returnPath,
  className,
  fullWidth = false,
}: {
  returnPath: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const buttonClass = cn("min-h-11", fullWidth && "w-full sm:w-auto");

  return (
    <div className={className}>
      <Button className={buttonClass} asChild>
        <Link href={authCrossLinkUrl("/login", returnPath)}>Sign in</Link>
      </Button>
      <Button variant="outline" className={buttonClass} asChild>
        <Link href={authCrossLinkUrl("/signup", returnPath)}>Sign up</Link>
      </Button>
    </div>
  );
}
