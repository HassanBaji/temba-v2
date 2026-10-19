"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

import { PersonMonogram } from "./person-monogram";
import { candidateManagers, type ManagerPerson } from "./staff-model";

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function AddManagerDialog({
  venueId,
  managers,
  open,
  onOpenChange,
}: {
  venueId: string;
  managers: readonly Pick<ManagerPerson, "userId">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  const search = api.venues.searchManagerUsers.useQuery(
    { query: debouncedQuery },
    { enabled: open && debouncedQuery.length > 0 },
  );

  const addManager = api.venues.addManager.useMutation({
    onSuccess: async () => {
      toast.success("Venue manager added");
      setQuery("");
      onOpenChange(false);
      await utils.venues.managedById.invalidate({ venueId });
      await utils.venues.listManaged.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const candidates = candidateManagers(search.data ?? [], managers);
  const searched = debouncedQuery.length > 0 && search.data !== undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (addManager.isPending && !next) {
          return;
        }
        if (!next) {
          setQuery("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-card gap-5 p-6 shadow-none">
        <DialogHeader>
          <DialogTitle>Add manager</DialogTitle>
          <DialogDescription>
            Search Temba Users by name, username, email or phone. They manage
            this Venue with the account they play with.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-[15px] -translate-y-1/2"
          />
          <Input
            aria-label="Search Users"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, username, email or phone"
            maxLength={100}
            autoComplete="off"
            autoFocus
            className="rounded-control h-10 min-h-10 pl-9 text-[13px] shadow-none"
          />
        </div>

        <div aria-live="polite" className="min-h-10">
          {search.isLoading && debouncedQuery.length > 0 ? (
            <p className="text-muted-foreground text-[13px]">Searching…</p>
          ) : null}
          {search.error ? (
            <p role="alert" className="text-destructive text-[13px]">
              {search.error.message}
            </p>
          ) : null}
          {searched && !search.isLoading && candidates.length === 0 ? (
            <p className="text-muted-foreground text-[13px]">No Users found.</p>
          ) : null}
          {candidates.length > 0 ? (
            <ul className="border-border divide-border rounded-block divide-y overflow-hidden border text-[13px]">
              {candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                >
                  <PersonMonogram
                    name={candidate.name}
                    image={candidate.image}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{candidate.name}</span>
                    {candidate.username ? (
                      <span className="text-muted-foreground block truncate">
                        @{candidate.username}
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    aria-label={`Add ${candidate.name} as Venue manager`}
                    className="rounded-block"
                    pending={
                      addManager.isPending &&
                      addManager.variables?.userId === candidate.id
                    }
                    pendingLabel="Adding…"
                    disabled={addManager.isPending}
                    onClick={() =>
                      addManager.mutate({ venueId, userId: candidate.id })
                    }
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
