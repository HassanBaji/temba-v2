"use client";

import "~/styles/globals.css";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { InviteShell } from "~/components/invites/invite-shell";

import { display, mono, sans } from "./fonts";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <body className="font-sans antialiased">
        <title>Something went wrong · Temba</title>
        <InviteShell>
          <ErrorState
            headingLevel={1}
            message="Temba could not load. Try again in a moment."
            onRetry={reset}
          />
        </InviteShell>
      </body>
    </html>
  );
}
