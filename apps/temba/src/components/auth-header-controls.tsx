"use client";

import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";

import { Button } from "~/components/ui/button";

export function AuthHeaderControls() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <Button variant="ghost">Sign in</Button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <Button>Sign up</Button>
        </SignUpButton>
      </Show>
    </div>
  );
}
