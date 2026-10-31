"use client";

import { useEffect } from "react";

import { installNavigationTrail } from "~/lib/navigation-trail";

export function NavigationTrail() {
  useEffect(installNavigationTrail, []);
  return null;
}
