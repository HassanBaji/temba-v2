# Supabase Storage for Venue logos

Venue logos are Operator-uploaded image files, not pasted URL strings. The App had no blob pipeline (only Clerk user images and unused URL columns). We store objects in a public-read Supabase Storage bucket and persist the public URL on Venue so Community home can render a logo without signed URLs.

**Considered Options**: keep an optional URL varchar (today’s courts/coach pattern — no real upload); Vercel Blob (App already runs on Vercel); private bucket plus signed URLs on every display. Rejected: URL paste is not the product; signed URLs are overkill for catalog chrome; Vercel Blob was a reasonable alternative, but the product choice is Supabase.
