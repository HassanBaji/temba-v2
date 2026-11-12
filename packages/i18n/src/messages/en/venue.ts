import { plural } from "../../plural";
export const venue = {
  errors: {
    notFound: "Venue not found",
    courtNotFound: "Court not found",
    photoNotFound: "Photo not found",
    managerOnly: "Only Venue managers can manage this Venue",
    alreadyManager: "This User already manages this Venue",
    closureEndAfterStart: "A Closure must end after it starts",
    cancelBookingsFirst: "Cancel its Bookings first",
    courtHasHistory: "This Court has Booking history and cannot be deleted",
    duplicateCourt: "A Court with this name already exists on this Venue",
    duplicateVenue: "A Venue with this name, city, and country already exists",
    photoLimit: (max: number) =>
      plural("en", max, {
        one: "A Venue can have at most 1 photo",
        other: "A Venue can have at most {n} photos",
      }),
    alreadyArchived: "Venue is already Soft-archived",
    notArchived: "Venue is not Soft-archived",
    logoEmpty: "Logo file is empty",
    photoEmpty: "Photo file is empty",
    photoTooLarge: "Photo must be at most 2 MB",
    hoursWholeMinutes: "Opening hours must be whole minutes from midnight",
    hoursLatestClose: "Closing time cannot be later than 06:00 the next day",
    onGrid: (slotMinutes: number) =>
      `Times must fall on the ${slotMinutes}-minute grid`,
    weekdayRange: "Weekday must be between 0 (Sunday) and 6 (Saturday)",
    pricingWeekday: "Choose at least one weekday, between 0 (Sunday) and 6",
    pricingWholeMinutes: "Pricing times must be whole minutes from midnight",
    pricingEndAfterStart: "A Pricing rule must end after it starts",
    pricingLatestEnd: "A Pricing rule cannot run later than 06:00 the next day",
    rateNegative: "The hourly rate cannot be negative",
    rateTooLarge: "The hourly rate is too large",
    pricingOverlap:
      "Pricing rules for the same Courts must not overlap in weekday and time",
    pricingRuleLimit: (max: number) =>
      plural("en", max, {
        one: "A Venue can have at most 1 Pricing rule",
        other: "A Venue can have at most {n} Pricing rules",
      }),
    labelTooLong: (max: number) =>
      plural("en", max, {
        one: "Labels can be at most 1 character",
        other: "Labels can be at most {n} characters",
      }),
    pricingCourtNotAtVenue:
      "A Pricing rule names a Court that is not in this Venue",
    slotLength: "Slot length must be 30 or 60 minutes",
    horizonRange: "Booking horizon must be between 1 and 90 days",
    leadTimeRange: "Minimum lead time must be between 0 and 1440 minutes",
    durationRequired: "Offer at least one duration",
    durationRange: (min: number, max: number) =>
      `Durations must be between ${min} and ${max} minutes`,
    durationMultiple: (slotMinutes: number) =>
      `Durations must be multiples of ${slotMinutes} minutes`,
    hoursOffGrid: (slotMinutes: number) =>
      `Opening hours are not on the ${slotMinutes}-minute grid. Adjust them first.`,
    pricingOffGrid: (slotMinutes: number) =>
      `Pricing rules are not on the ${slotMinutes}-minute grid. Adjust them first.`,
    archivedNoBookings: "An archived Venue cannot accept bookings",
    archivedNoPartner: "An archived Venue cannot be a partner Venue",
    addCourtFirst: "Add a Court before accepting bookings",
    invalidCancellationPolicy: "Invalid Cancellation policy",
  },
};
