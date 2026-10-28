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
  label: string;
  icon: LucideIcon;
};

/** Sidebar order follows the design (A1 to A8); Photos and Venue details are the console's own additions. */
export const CONSOLE_NAV: readonly ConsoleNavItem[] = [
  { segment: "schedule", label: "Schedule", icon: CalendarDays },
  { segment: "bookings", label: "Bookings", icon: List },
  { segment: "courts", label: "Courts & pricing", icon: LayoutGrid },
  { segment: "hours", label: "Hours & closures", icon: Clock },
  { segment: "customers", label: "Customers", icon: Users },
  { segment: "staff", label: "Staff & roles", icon: Shield },
  { segment: "reports", label: "Reports", icon: BarChart3 },
  { segment: "payouts", label: "Payouts", icon: Wallet },
  { segment: "photos", label: "Photos", icon: Images },
  { segment: "groups", label: "Groups", icon: UsersRound },
  { segment: "details", label: "Venue details", icon: Building2 },
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

export function titleForSegment(segment: ConsoleSegment | undefined) {
  return (
    CONSOLE_NAV.find((item) => item.segment === segment)?.label ??
    "Venue console"
  );
}
