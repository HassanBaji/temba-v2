"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { api } from "~/trpc/react";
import { useMessages } from "~/components/locale-provider";

const MIN_QUERY_LENGTH = 2;

export function LinkGroupSheet({
  venueId,
  open,
  onOpenChange,
}: {
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { consoleVenue } = useMessages();
  const g = consoleVenue.groups;
  const utils = api.useUtils();
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const canSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const search = api.venues.searchLinkableGroups.useQuery(
    { venueId, query: debouncedQuery },
    { enabled: open && canSearch },
  );

  const send = api.venues.sendGroupLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success(g.sentToast);
      await utils.venues.listLinkedGroups.invalidate({ venueId });
      await utils.venues.searchLinkableGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const results = search.data ?? [];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery("");
        }
        onOpenChange(next);
      }}
    >
      <SheetContent className="gap-5 p-6 shadow-none">
        <SheetHeader className="p-0">
          <SheetTitle>{g.link}</SheetTitle>
          <SheetDescription>{g.sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-[15px] -translate-y-1/2"
          />
          <Input
            aria-label={g.searchLabel}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={g.searchPlaceholder}
            maxLength={255}
            autoComplete="off"
            autoFocus
            className="rounded-control h-10 min-h-10 ps-9 text-[13px] shadow-none"
          />
        </div>

        <div aria-live="polite" className="min-h-10">
          {search.isLoading && canSearch ? (
            <p className="text-muted-foreground text-[13px]">{g.searching}</p>
          ) : null}
          {search.error ? (
            <p role="alert" className="text-destructive text-[13px]">
              {search.error.message}
            </p>
          ) : null}
          {canSearch && search.data && results.length === 0 ? (
            <p className="text-muted-foreground text-[13px]">{g.noneFound}</p>
          ) : null}
          {results.length > 0 ? (
            <ul className="border-border divide-border rounded-block divide-y overflow-hidden border text-[13px]">
              {results.map((group) => {
                const name = group.name ?? g.untitled;
                return (
                  <li
                    key={group.id}
                    className="flex items-center gap-2.5 px-3 py-2.5"
                  >
                    <EntityMonogram name={name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{name}</span>
                      <span className="text-muted-foreground block truncate">
                        {g.members(group.memberCount)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      aria-label={g.sendNamed(name)}
                      className="rounded-block"
                      pending={
                        send.isPending && send.variables?.groupId === group.id
                      }
                      pendingLabel={g.sending}
                      disabled={send.isPending}
                      onClick={() =>
                        send.mutate({ venueId, groupId: group.id })
                      }
                    >
                      {g.send}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
