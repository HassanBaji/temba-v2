import { MapPin } from "lucide-react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

export function GameVenueCard({
  venue,
  courtNames,
}: {
  venue: {
    name: string;
    city: string;
    country: string;
    logoImageUrl: string | null;
    archivedAt: Date | string | null;
  } | null;
  courtNames: string[];
}) {
  if (!venue) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-title flex items-center gap-2 font-semibold tracking-[-0.01em]">
        <MapPin
          aria-hidden="true"
          className="text-muted-foreground size-4"
          strokeWidth={1.75}
        />
        Court information
      </h2>
      <Card variant="raised">
        <div className="flex items-start gap-3">
          <EntityMonogram
            name={venue.name}
            image={venue.logoImageUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lead font-semibold">{venue.name}</p>
            <p className="text-meta text-muted-foreground">
              {venue.city}, {venue.country}
            </p>
            {venue.archivedAt ? (
              <Badge variant="outline">Soft-archived</Badge>
            ) : null}
          </div>
        </div>
        {courtNames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {courtNames.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-meta text-muted-foreground">No Court assigned.</p>
        )}
      </Card>
    </section>
  );
}
