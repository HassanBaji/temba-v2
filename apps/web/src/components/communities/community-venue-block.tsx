import { ActionMenu, ActionMenuItem } from "~/components/common/action-menu";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  COMMUNITY_LINK_VENUE_LABEL,
  COMMUNITY_NO_COURTS_COPY,
  COMMUNITY_NO_VENUE_COPY,
  COMMUNITY_UNLINK_VENUE_LABEL,
  communityVenueView,
} from "@repo/domain/community";
import { type RouterOutputs } from "~/trpc/react";

type CommunityHome = RouterOutputs["communities"]["byId"];

export function CommunityVenueBlock({
  community,
  onUnlink,
  onLinkVenue,
}: {
  community: CommunityHome;
  onUnlink: () => void;
  onLinkVenue: () => void;
}) {
  const { venue, location, notes, canRequestLink, canUnlink } =
    communityVenueView(community);
  return (
    <section className="border-rule flex flex-col gap-4 rounded-[14px] border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground font-mono text-[11px] font-normal uppercase tracking-[0.04em]">
          Venue
        </h2>
        {canUnlink ? (
          <ActionMenu label="Venue actions">
            <ActionMenuItem variant="destructive" onSelect={onUnlink}>
              {COMMUNITY_UNLINK_VENUE_LABEL}
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
                {location}
              </p>
              {venue.archivedAt ? (
                <Badge variant="outline" className="mt-2">
                  Venue Soft-archived
                </Badge>
              ) : null}
            </div>
          </div>
          {venue.courts.length === 0 ? (
            <p className="text-meta text-muted-foreground">
              {COMMUNITY_NO_COURTS_COPY}
            </p>
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
          {COMMUNITY_NO_VENUE_COPY}
        </p>
      )}

      {notes.map((note) => (
        <p key={note} className="text-meta text-muted-foreground">
          {note}
        </p>
      ))}

      {canRequestLink ? (
        <Button
          type="button"
          className="bg-ink text-paper hover:bg-dimrule h-11 w-full rounded-[10px] font-semibold"
          onClick={onLinkVenue}
        >
          {COMMUNITY_LINK_VENUE_LABEL}
        </Button>
      ) : null}
    </section>
  );
}
