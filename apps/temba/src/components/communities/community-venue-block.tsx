import { ActionMenu, ActionMenuItem } from "~/components/common/action-menu";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { type RouterOutputs } from "~/trpc/react";

type CommunityHome = RouterOutputs["communities"]["byId"];

export function CommunityVenueBlock({
  venue,
  venueLinkRequest,
  canUnlinkVenue,
  canRequestVenueLink,
  canManageVenueLink,
  onUnlink,
  onLinkVenue,
}: {
  venue: CommunityHome["venue"];
  venueLinkRequest: CommunityHome["venueLinkRequest"];
  canUnlinkVenue: boolean;
  canRequestVenueLink: boolean;
  canManageVenueLink: boolean;
  onUnlink: () => void;
  onLinkVenue: () => void;
}) {
  return (
    <Card variant="raised">
      <div className="flex items-start justify-between gap-2">
        <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
          Venue
        </p>
        {venue && canUnlinkVenue ? (
          <ActionMenu label="Venue actions">
            <ActionMenuItem variant="destructive" onSelect={onUnlink}>
              Unlink Venue
            </ActionMenuItem>
          </ActionMenu>
        ) : null}
      </div>

      {venue ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <EntityMonogram
              name={venue.name}
              image={venue.logoImageUrl}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-lead font-semibold">{venue.name}</p>
              <p className="text-meta text-muted-foreground">
                {venue.city}, {venue.country}
              </p>
              {venue.archivedAt ? (
                <Badge variant="outline" className="mt-1">
                  Venue Soft-archived
                </Badge>
              ) : null}
            </div>
          </div>
          {venue.courts.length === 0 ? (
            <p className="text-meta text-muted-foreground">No Courts.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {venue.courts.map((court) => (
                <Badge key={court.id} variant="secondary">
                  {court.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-body text-muted-foreground">
          This Community is not linked to a Venue.
        </p>
      )}

      {canManageVenueLink && venueLinkRequest?.status === "pending" ? (
        <p className="text-meta text-muted-foreground">
          Venue link request pending for {venueLinkRequest.venue.name} (
          {venueLinkRequest.venue.city}, {venueLinkRequest.venue.country}).
        </p>
      ) : null}

      {canManageVenueLink &&
      venueLinkRequest?.status === "rejected" &&
      !venue ? (
        <p className="text-meta text-muted-foreground">
          Last Venue link request for {venueLinkRequest.venue.name} was
          rejected. You may request again.
        </p>
      ) : null}

      {!venue && canRequestVenueLink ? (
        <Button type="button" className="min-h-11 w-full" onClick={onLinkVenue}>
          Link a Venue
        </Button>
      ) : null}
    </Card>
  );
}
