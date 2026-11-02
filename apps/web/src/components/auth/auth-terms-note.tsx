import Link from "next/link";

import { touchHitArea } from "~/components/ui/button";
import type { SurfaceTone } from "@repo/domain/surface-tone";
import { TERMS_MINIMUM_AGE } from "@repo/domain/terms";
import { cn } from "~/lib/utils";

/**
 * The consent line under every door. Continuing is the consent: the forms
 * send `legalAccepted: true`, there is no checkbox (ADR-0049).
 */
export function AuthTermsNote({
  lead,
  surface = "paper",
  className,
}: {
  /** A sentence before the consent, such as the SMS rates note. */
  lead?: string;
  surface?: SurfaceTone;
  className?: string;
}) {
  const onInk = surface === "ink";
  const linkClass = cn(
    touchHitArea,
    "underline",
    onInk ? "text-paper" : "text-ink",
  );
  return (
    <p
      className={cn(
        "text-eyebrow text-center leading-[1.6]",
        onInk ? "text-dim" : "text-muted-foreground",
        className,
      )}
    >
      {lead ? `${lead} ` : null}
      By continuing you confirm you are {TERMS_MINIMUM_AGE} or older and agree
      to the{" "}
      <Link className={linkClass} href="/terms">
        Terms
      </Link>{" "}
      and{" "}
      <Link className={linkClass} href="/privacy">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
