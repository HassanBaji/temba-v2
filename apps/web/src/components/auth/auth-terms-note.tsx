"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { useMessages } from "~/components/locale-provider";
import { touchHitArea } from "~/components/ui/button";
import type { SurfaceTone } from "@repo/domain/surface-tone";
import { TERMS_MINIMUM_AGE } from "@repo/domain/terms";
import { cn } from "~/lib/utils";

/**
 * Renders a catalog sentence that carries `{name}` slots, so a link or a
 * styled span can sit inside one leaf without splitting the sentence.
 */
export function SlotText({
  text,
  slots,
}: {
  text: string;
  slots: Record<string, ReactNode>;
}) {
  const parts = text.split(/\{(\w+)\}/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Fragment key={index}>{slots[part] ?? `{${part}}`}</Fragment>
        ) : (
          part
        ),
      )}
    </>
  );
}

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
  const m = useMessages();
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
      <SlotText
        text={m.webAuth.termsNote.consent(TERMS_MINIMUM_AGE)}
        slots={{
          terms: (
            <Link className={linkClass} href="/terms">
              {m.webAuth.termsNote.termsLink}
            </Link>
          ),
          privacy: (
            <Link className={linkClass} href="/privacy">
              {m.webAuth.termsNote.privacyLink}
            </Link>
          ),
        }}
      />
    </p>
  );
}
