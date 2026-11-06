"use client";

import { BackButton } from "~/components/ui/nav-icon-button";

export function PlayerBackButton({ surface }: { surface: "ink" | "paper" }) {
  return <BackButton variant="boxed" surface={surface} href="/dashboard" />;
}
