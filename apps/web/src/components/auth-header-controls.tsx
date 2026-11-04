"use client";

import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

export function AuthHeaderControls() {
  const m = useMessages();
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <Button variant="ghost">{m.common.signIn}</Button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <Button>{m.common.signUp}</Button>
        </SignUpButton>
      </Show>
    </div>
  );
}
