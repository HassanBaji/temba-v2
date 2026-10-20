# Venue photos are a library with a main and a details pick

**Status:** accepted. Extends ADR-0016 to a third bucket prefix.

A Venue manager uploads up to ten **Venue photos** from the Venue console (Photos section). Each is a `venue_photos` row and one bucket object at `venue-photos/<venueId>/<photoId>`, streamed by the API App at `/api/media/venue-photos/<venueId>/<photoId>`. The Venue row points at two of them: `cover_photo_id`, the **Main photo** that fronts the Venue card in the mobile App's Venue list, and `detail_photo_id`, the **Details photo** at the top of the Venue screen. Either may be the same photo. The first upload fills both; deleting a picked photo hands its place to the oldest photo left, so neither is empty while a photo exists. With no photos, the App keeps showing the logo, then hatch.

## Why

- Managers asked to choose what players see first and what they see on the Venue page, and to see it before players do. A library with two picks lets them swap pictures without re-uploading.
- A photo id never changes bytes, so its media URL needs no `v` cache-bust and is derived, not stored. Only the picks live on the Venue row.
- The App decides the fallback order through `@repo/domain/venue-photos`, and the console preview calls the same functions, so the preview cannot drift from the App.

## Considered options

1. Two fixed slots (`cover_image_url`, `detail_image_url`) like the logo. Rejected: swapping which picture is main means uploading again, and managers want a few pictures to choose from.
2. A `role` column on `venue_photos` with a partial unique index per role. Rejected: one photo cannot hold both roles without a second row.
3. Per-Court photos. Deferred: the App shows Venues, not Courts, on its booking screens; nothing would display them yet.

## Consequences

- The API keeps ADR-0016's 2 MB cap and the 4 MB tRPC body limit. The console redraws a larger photo as a JPEG of at most 2400px on its long edge before upload; HEIC is refused.
- `listBookableVenues` gains `coverImageUrl`; `venueForBooking` gains `coverImageUrl` and `detailImageUrl`. Both changes are additive.
- Deleting a photo removes its bucket object before its row, so a failed delete leaves both in place.
