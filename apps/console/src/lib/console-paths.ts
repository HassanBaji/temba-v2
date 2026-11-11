import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock,
  Images,
  LayoutGrid,
  List,
  Shield,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

export const CONSOLE_SEGMENTS = [
  "schedule",
  "bookings",
  "courts",
  "hours",
  "customers",
  "staff",
  "reports",
  "payouts",
  "photos",
  "groups",
  "details",
] as const;

export type ConsoleSegment = (typeof CONSOLE_SEGMENTS)[number];

export type ConsoleNavItem = {
  segment: ConsoleSegment;
  icon: LucideIcon;
};

/** Sidebar order follows the design (A1 to A8); Photos and Venue details are the console's own additions. */
export const CONSOLE_NAV: readonly ConsoleNavItem[] = [
  { segment: "schedule", icon: CalendarDays },
  { segment: "bookings", icon: List },
  { segment: "courts", icon: LayoutGrid },
  { segment: "hours", icon: Clock },
  { segment: "customers", icon: Users },
  { segment: "staff", icon: Shield },
  { segment: "reports", icon: BarChart3 },
  { segment: "payouts", icon: Wallet },
  { segment: "photos", icon: Images },
  { segment: "groups", icon: UsersRound },
  { segment: "details", icon: Building2 },
];

export function venuePath(
  venueId: string,
  segment: ConsoleSegment = "schedule",
) {
  return `/${venueId}/${segment}`;
}

export function bookingPath(venueId: string, bookingId: string) {
  return `/${venueId}/bookings/${bookingId}`;
}

export function segmentFromPathname(
  pathname: string,
  venueId: string,
): ConsoleSegment | undefined {
  const rest = pathname.startsWith(`/${venueId}/`)
    ? pathname.slice(venueId.length + 2).split("/")[0]
    : undefined;
  return CONSOLE_SEGMENTS.find((segment) => segment === rest);
}
