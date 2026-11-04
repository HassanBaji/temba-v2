import { ActionMenu, ActionMenuItem } from "~/components/common/action-menu";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { communityVenueView } from "@repo/domain/community";
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
  const m = useMessages();
  const locale = useLocale();
  const { venue, location, notes, canRequestLink, canUnlink } =
    communityVenueView(community, locale);
  return (
    <section className="border-rule flex flex-col gap-4 rounded-[14px] border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground font-mono text-[11px] font-normal uppercase tracking-[0.04em]">
          {m.webGroup.venue.title}
        </h2>
        {canUnlink ? (
          <ActionMenu label={m.webGroup.venue.actions}>
            <ActionMenuItem variant="destructive" onSelect={onUnlink}>
              {m.community.action.unlinkVenue}
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
                  {m.webGroup.venue.softArchived}
                </Badge>
              ) : null}
            </div>
          </div>
          {venue.courts.length === 0 ? (
            <p className="text-meta text-muted-foreground">
              {m.community.venue.noCourts}
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
          {m.community.venue.noVenue}
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
          {m.community.action.linkVenue}
        </Button>
      ) : null}
    </section>
  );
}
