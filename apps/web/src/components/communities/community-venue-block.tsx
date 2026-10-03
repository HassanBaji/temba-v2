import { ActionMenu, ActionMenuItem } from "~/components/common/action-menu";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
    <section className="border-rule flex flex-col gap-4 rounded-[14px] border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground font-mono text-[11px] font-normal uppercase tracking-[0.04em]">
          Venue
        </h2>
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
          <div className="flex items-start gap-3.5">
            <EntityMonogram
              name={venue.name}
              image={venue.logoImageUrl}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-body break-words font-semibold">
                {venue.name}
              </p>
              <p className="text-meta text-muted-foreground break-words">
                {venue.city}, {venue.country}
              </p>
              {venue.archivedAt ? (
                <Badge variant="outline" className="mt-2">
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
                <span
                  key={court.id}
                  className="border-rule text-meta rounded-[10px] border px-2.5 py-1"
                >
                  {court.name}
                </span>
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
        <Button
          type="button"
          className="bg-ink text-paper hover:bg-dimrule h-11 w-full rounded-[10px] font-semibold"
          onClick={onLinkVenue}
        >
          Link a Venue
        </Button>
      ) : null}
    </section>
  );
}
