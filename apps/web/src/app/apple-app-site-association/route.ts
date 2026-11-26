import { env } from "~/env";
import { appleAppSiteAssociation } from "~/lib/apple-app-site-association";

export const dynamic = "force-dynamic";

export function GET() {
  if (!env.APPLE_APP_ID) {
    return new Response(null, { status: 404 });
  }
  return Response.json(appleAppSiteAssociation(env.APPLE_APP_ID));
}
