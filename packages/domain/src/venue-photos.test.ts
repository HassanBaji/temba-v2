import { describe, expect, it } from "vitest";

import { venueCardImage, venuePageImage } from "./venue-photos";

const LOGO = "/api/media/venue-logos/v/logo?v=1";
const COVER = "/api/media/venue-photos/v/cover";
const DETAIL = "/api/media/venue-photos/v/detail";

describe("venueCardImage", () => {
  it("shows the main photo over the logo", () => {
    expect(
      venueCardImage({
        coverImageUrl: COVER,
        detailImageUrl: DETAIL,
        logoImageUrl: LOGO,
      }),
    ).toEqual({ kind: "photo", url: COVER });
  });

  it("falls back to the logo, then to nothing", () => {
    expect(venueCardImage({ coverImageUrl: null, logoImageUrl: LOGO })).toEqual(
      { kind: "logo", url: LOGO },
    );
    expect(venueCardImage({ coverImageUrl: null, logoImageUrl: null })).toEqual(
      { kind: "none" },
    );
  });
});

describe("venuePageImage", () => {
  it("shows the details photo first", () => {
    expect(
      venuePageImage({
        coverImageUrl: COVER,
        detailImageUrl: DETAIL,
        logoImageUrl: LOGO,
      }),
    ).toEqual({ kind: "photo", url: DETAIL });
  });

  it("falls back to the main photo, then the logo", () => {
    expect(
      venuePageImage({
        coverImageUrl: COVER,
        detailImageUrl: null,
        logoImageUrl: LOGO,
      }),
    ).toEqual({ kind: "photo", url: COVER });
    expect(
      venuePageImage({
        coverImageUrl: null,
        detailImageUrl: null,
        logoImageUrl: LOGO,
      }),
    ).toEqual({ kind: "logo", url: LOGO });
  });
});
