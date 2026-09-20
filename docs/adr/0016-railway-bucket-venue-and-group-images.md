# Railway Bucket for Venue logos and Group images

Venue logos and Group images are Operator- or Group-approver-uploaded catalog chrome (JPEG/PNG/WebP ≤ 2 MB), not Clerk User photos. Railway Buckets are private S3-compatible storage, so the App cannot persist a public object URL. We Put/Get/Delete with the AWS SDK against one bucket (`venue-logos/` and `group-images/` prefixes) and persist a stable App media URL (`/api/media/...`) that a sessionless GET streams with long cache and a `v` query on replace. This supersedes ADR-0006 and ADR-0015.

**Considered Options**: persist a Tigris/presigned URL at upload (expires; lists rot); sign on every list/`byId` (the stored column would not be what `<img>` uses, or URLs would expire; Groups hub would N-presign per page); redirect GET to a short-lived presign (needs the presigner package; CDN would cache Tigris URLs); a public Railway bucket (not offered); Vercel Blob; browser presigned POST. Rejected: catalog chrome needs a stable URL the UI already stores on the row; an App GET proxy plus cache-bust `v` keeps `<img>` / EntityMonogram unchanged. Clerk User photos stay on Clerk. Do not invent a generic blob service.

**Consequences**: App/Vercel egress is billed on cache miss; bucket egress stays free. Leftover historical Supabase URLs remain until replace/clear.
