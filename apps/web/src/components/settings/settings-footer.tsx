"use client";

import * as React from "react";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

export function SettingsFooter({
  displayName,
  phoneNumber,
  onSignOut,
}: {
  displayName: string;
  phoneNumber?: string | null;
  onSignOut: () => Promise<void>;
}) {
  const m = useMessages();
  const [signingOut, setSigningOut] = React.useState(false);
  const identity =
    phoneNumber != null && phoneNumber !== ""
      ? `${displayName} · ${phoneNumber}`
      : displayName;

  async function signOut() {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      await onSignOut();
    } catch (error) {
      setSigningOut(false);
      throw error;
    }
  }

  return (
    <div className="border-rule mt-auto flex flex-col gap-2.5 border-t pb-[26px] pt-5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        pending={signingOut}
        pendingLabel={m.webAuth.settings.signingOut}
        className="w-full"
        onClick={() => {
          void signOut();
        }}
      >
        {m.common.signOut}
      </Button>
      <p className="text-muted-foreground text-center font-mono text-[11px] uppercase">
        {identity}
      </p>
    </div>
  );
}
