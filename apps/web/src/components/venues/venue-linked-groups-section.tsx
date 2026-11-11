"use client";

import * as React from "react";
import { toast } from "sonner";

import { sportLabel } from "@repo/domain/sport";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

const MIN_QUERY_LENGTH = 2;

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type GroupTarget = { id: string; name: string };

export function VenueLinkedGroupsSection({
  venueId,
  venueName,
}: {
  venueId: string;
  venueName: string;
}) {
  const messages = useMessages();
  const m = messages.webDashboard.venue.linkedGroups;
  const locale = useLocale();
  const utils = api.useUtils();
  const linked = api.venues.listLinkedGroups.useQuery({ venueId });
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const canSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const [linkTarget, setLinkTarget] = React.useState<GroupTarget | null>(null);
  const [unlinkTarget, setUnlinkTarget] = React.useState<GroupTarget | null>(
    null,
  );

  const archived = linked.data?.venue.archived ?? false;
  const search = api.venues.searchGroupsToLink.useQuery(
    { query: debouncedQuery },
    { enabled: canSearch && !archived },
  );

  async function refreshLinks() {
    await Promise.all([
      utils.venues.listLinkedGroups.invalidate({ venueId }),
      utils.venues.byId.invalidate({ id: venueId }),
      utils.venues.searchGroupsToLink.invalidate(),
      utils.venues.searchLinkableGroups.invalidate(),
      utils.groups.listForOperator.invalidate(),
    ]);
  }

  const linkGroup = api.venues.linkGroup.useMutation({
    onSuccess: async () => {
      toast.success(m.linkedToast(linkTarget?.name ?? messages.group.untitled));
      setQuery("");
      await refreshLinks();
    },
    onError: () => {
      void search.refetch();
    },
  });

  const unlinkGroup = api.venues.unlinkGroup.useMutation({
    onSuccess: async () => {
      toast.success(
        m.unlinkedToast(unlinkTarget?.name ?? messages.group.untitled),
      );
      await refreshLinks();
    },
    onError: () => {
      void linked.refetch();
    },
  });

  function groupMeta(group: {
    sport: string | null;
    memberCount: number;
    type: string | null;
  }) {
    return m.meta(
      sportLabel(group.sport, locale),
      group.memberCount,
      group.type === "private",
    );
  }

  const linkedGroups = linked.data?.groups ?? [];
  const results = search.data ?? [];

  return (
    <Section title={m.title} description={m.description}>
      {linked.error ? (
        <ErrorState
          headingLevel={3}
          title={m.loadError}
          error={linked.error}
          onRetry={() => {
            void linked.refetch();
          }}
        />
      ) : null}

      {linked.data && linkedGroups.length === 0 ? (
        <p className="text-body text-muted-foreground">{m.empty}</p>
      ) : null}

      {linkedGroups.length > 0 ? (
        <RowList>
          {linkedGroups.map((group) => {
            const name = group.name ?? messages.group.untitled;
            return (
              <ListRow
                key={group.id}
                leading={<EntityMonogram name={name} />}
                title={name}
                meta={groupMeta(group)}
                trailing={
                  group.canUnlink ? (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={m.unlinkNamed(name)}
                      disabled={unlinkGroup.isPending}
                      onClick={() => setUnlinkTarget({ id: group.id, name })}
                    >
                      {m.unlink}
                    </Button>
                  ) : undefined
                }
              />
            );
          })}
        </RowList>
      ) : null}

      {archived ? (
        <p className="text-body text-muted-foreground">{m.archivedNote}</p>
      ) : linked.data ? (
        <>
          <Field>
            <FieldLabel htmlFor="venue-link-group-search">
              {m.searchLabel}
            </FieldLabel>
            <Input
              id="venue-link-group-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={m.searchPlaceholder}
              maxLength={255}
              autoComplete="off"
              aria-describedby="venue-link-group-search-help"
            />
            <FieldDescription id="venue-link-group-search-help">
              {m.searchHint}
            </FieldDescription>
          </Field>

          <div aria-live="polite">
            {canSearch && search.isLoading ? (
              <p className="text-body text-muted-foreground">{m.searching}</p>
            ) : null}
            {search.error ? (
              <p role="alert" className="text-body text-destructive">
                {search.error.message}
              </p>
            ) : null}
            {canSearch && search.data && results.length === 0 ? (
              <p className="text-body text-muted-foreground">{m.noResults}</p>
            ) : null}
          </div>

          {canSearch && results.length > 0 ? (
            <RowList>
              {results.map((group) => {
                const name = group.name ?? messages.group.untitled;
                return (
                  <ListRow
                    key={group.id}
                    leading={
                      <EntityMonogram name={name} image={group.imageUrl} />
                    }
                    title={name}
                    meta={groupMeta(group)}
                    trailing={
                      <Button
                        type="button"
                        aria-label={m.linkNamed(name)}
                        disabled={linkGroup.isPending}
                        onClick={() => setLinkTarget({ id: group.id, name })}
                      >
                        {m.link}
                      </Button>
                    }
                  />
                );
              })}
            </RowList>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={linkTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLinkTarget(null);
          }
        }}
        title={m.linkConfirm.title(
          linkTarget?.name ?? messages.group.untitled,
          venueName,
        )}
        description={m.linkConfirm.description(
          linkTarget?.name ?? messages.group.untitled,
        )}
        confirmLabel={m.linkConfirm.confirmLabel}
        variant="default"
        pending={linkGroup.isPending}
        onConfirm={async () => {
          if (!linkTarget) {
            return;
          }
          await linkGroup.mutateAsync({ venueId, groupId: linkTarget.id });
        }}
      />

      <ConfirmDialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setUnlinkTarget(null);
          }
        }}
        title={m.unlinkConfirm.title(
          unlinkTarget?.name ?? messages.group.untitled,
        )}
        description={m.unlinkConfirm.description(
          unlinkTarget?.name ?? messages.group.untitled,
        )}
        confirmLabel={m.unlinkConfirm.confirmLabel}
        pending={unlinkGroup.isPending}
        onConfirm={async () => {
          if (!unlinkTarget) {
            return;
          }
          await unlinkGroup.mutateAsync({ venueId, groupId: unlinkTarget.id });
        }}
      />
    </Section>
  );
}
