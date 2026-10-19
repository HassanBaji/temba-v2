"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { RouterOutputs } from "~/trpc/react";

export type ManagedVenue = RouterOutputs["venues"]["managedById"];

const ManagedVenueContext = createContext<ManagedVenue | null>(null);

export function ManagedVenueProvider({
  venue,
  children,
}: {
  venue: ManagedVenue;
  children: ReactNode;
}) {
  return (
    <ManagedVenueContext.Provider value={venue}>
      {children}
    </ManagedVenueContext.Provider>
  );
}

/** The Venue the console is scoped to; `venues.managedById` keeps it fresh after mutations. */
export function useManagedVenue(): ManagedVenue {
  const venue = useContext(ManagedVenueContext);
  if (!venue) {
    throw new Error("useManagedVenue needs a ManagedVenueProvider");
  }
  return venue;
}
