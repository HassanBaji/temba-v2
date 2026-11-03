"use client";

import "~/styles/globals.css";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { InviteShell } from "~/components/invites/invite-shell";
import { useLocale, useMessages } from "~/components/locale-provider";

import { display, mono, sans } from "./fonts";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <body className="font-sans antialiased">
        <title>{m.webAuth.errors.globalTitle}</title>
        <InviteShell>
          <ErrorState
            headingLevel={1}
            message={m.webAuth.errors.globalMessage}
            onRetry={reset}
          />
        </InviteShell>
      </body>
    </html>
  );
}
