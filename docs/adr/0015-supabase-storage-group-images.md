# Supabase Storage for Group images

**Status:** superseded by [ADR-0016](./0016-railway-bucket-venue-and-group-images.md).

Group images are User-uploaded files on a Temba Group (Club Group or Loose Group), not Clerk User photos and not Venue logos. The App already stores Venue logos in a public-read Supabase bucket (ADR-0006) and keeps User photos on Clerk. Group is a Temba entity, so images live in a sibling public-read bucket (`SUPABASE_GROUP_IMAGES_BUCKET`) with the public URL on Group, using the same JPEG/PNG/WebP ≤ 2 MB magic-byte rules as Venue logos.

**Considered Options**: put Group files in the Venue logos bucket under a prefix; extend Clerk to Groups; paste a URL; Vercel Blob; amend ADR-0006 into generic entity images. Rejected: the Venue bucket is Operator catalog chrome; Clerk is for Users; URL paste is not the product; Vercel Blob was already rejected for Venue; User photos must stay on Clerk so 0006 remains Venue-only.
