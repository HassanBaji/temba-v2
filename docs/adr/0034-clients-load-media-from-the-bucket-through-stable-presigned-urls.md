# Clients load media from the bucket through stable presigned URLs

**Status:** accepted. Supersedes the media GET of [ADR-0016](./0016-railway-bucket-venue-and-group-images.md).

ADR-0016 streamed every Venue logo, Group image and Venue photo through the API App at `/api/media/...`. Each image cost the API a bucket read and its own egress, and the bytes crossed two hops. Clients now read images from the bucket directly, and the API only hands out the URLs.

## Decision

- **Rows keep their stored paths.** `logo_image_url`, `image_url` and the Venue photo ids still produce `/api/media/<key>?v=<unixMs>`. The path names the bucket object and the `v` names its version. No data migration.
- **One tRPC middleware signs every output.** The base procedure swaps any string that is a stored media path for a presigned bucket GET (`@aws-sdk/s3-request-presigner`). Procedure files and their tests keep returning stored paths; only what leaves the API changes. Presigning is local HMAC work, memoised per window.
- **URLs are stable so clients can cache them.** The signing date is the start of a six-day window and the expiry is seven days (the SigV4 cap), so every request in a window gets the same URL and the last one handed out still has a day left. `v` is a signed query parameter, so replacing an image changes its URL at once.
- **The bucket sends a long cache.** The URL asks for `Cache-Control: public, max-age=31536000, immutable` (`response-cache-control`), and uploads store the same header on the object. Web and console `<img>` tags use the browser cache. The mobile App loads images with `expo-image` on a memory and disk cache keyed by the URL without its `X-Amz-*` parameters, so a re-signed URL still hits the cache across launches.
- **The `/api/media` routes are gone.** Nothing serves image bytes from the API.

**Considered Options**: a public bucket or CDN (Railway Buckets are private); a fresh presign per request (a new URL every time defeats every cache); redirecting `/api/media` to a presign (keeps an API hop per image); persisting presigned URLs on rows (they expire).

## Consequences

- Web browsers download each image again at most once per window; mobile keeps it until the disk cache evicts it.
- A page left open past a URL's expiry shows a broken image until its query refetches.
- The bucket must honour `response-cache-control` and accept the signed `v` parameter. Checked against the SDK only; confirm against the live bucket.
- The mobile App needs a new native build for `expo-image`.
