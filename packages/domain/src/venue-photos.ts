export const VENUE_PHOTO_LIMIT = 10;

export type VenueBannerImage =
  | { kind: "photo"; url: string }
  | { kind: "logo"; url: string }
  | { kind: "none" };

type VenueImages = {
  coverImageUrl: string | null;
  detailImageUrl?: string | null;
  logoImageUrl: string | null;
};

function bannerImage(
  photoUrl: string | null | undefined,
  logoImageUrl: string | null,
): VenueBannerImage {
  if (photoUrl) {
    return { kind: "photo", url: photoUrl };
  }
  if (logoImageUrl) {
    return { kind: "logo", url: logoImageUrl };
  }
  return { kind: "none" };
}

/** The Venue list card: the main photo, else the logo, else hatch. */
export function venueCardImage(venue: VenueImages): VenueBannerImage {
  return bannerImage(venue.coverImageUrl, venue.logoImageUrl);
}

/** The Venue screen header: the details photo, else the main photo, else the logo. */
export function venuePageImage(venue: VenueImages): VenueBannerImage {
  return bannerImage(
    venue.detailImageUrl ?? venue.coverImageUrl,
    venue.logoImageUrl,
  );
}
