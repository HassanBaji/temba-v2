export const SPORTS = ["padel", "football"] as const;

export type Sport = (typeof SPORTS)[number];
