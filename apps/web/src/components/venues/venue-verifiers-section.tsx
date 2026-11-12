"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

type VerifierKind = RouterOutputs["venues"]["listVerifiers"][number]["kind"];

const KINDS: readonly VerifierKind[] = ["club_staff", "referee", "coach"];

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** The Operator's Verifiers list on a Venue page (ADR-0072). */
export function VenueVerifiersSection({ venueId }: { venueId: string }) {
  const messages = useMessages();
  const m = messages.webUi.venueVerifiers;
  const kinds = messages.rating.verifier.kinds;
  const common = messages.common;
  const utils = api.useUtils();
  const verifiers = api.venues.listVerifiers.useQuery({ venueId });
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<VerifierKind>("club_staff");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const [removeUserId, setRemoveUserId] = React.useState<string | null>(null);

  const search = api.venues.searchManagerUsers.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  const addVerifier = api.venues.addVerifier.useMutation({
    onSuccess: async () => {
      toast.success(m.addedToast);
      setQuery("");
      await utils.venues.listVerifiers.invalidate({ venueId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeVerifier = api.venues.removeVerifier.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.removedToast);
      await utils.venues.listVerifiers.invalidate({ venueId });
    },
  });

  const current = verifiers.data ?? [];
  const currentIds = new Set(current.map((verifier) => verifier.userId));
  const candidates = (search.data ?? []).filter(
    (row) => !currentIds.has(row.id),
  );
  const removeName =
    current.find((verifier) => verifier.userId === removeUserId)?.name ??
    m.thisUser;

  return (
    <Section title={m.title} description={m.description}>
      {verifiers.error ? (
        <ErrorState
          headingLevel={3}
          title={m.loadError}
          error={verifiers.error}
          onRetry={() => {
            void verifiers.refetch();
          }}
        />
      ) : null}

      {verifiers.data && current.length === 0 ? (
        <p className="text-body text-muted-foreground">{m.none}</p>
      ) : null}

      {current.length > 0 ? (
        <RowList>
          {current.map((verifier) => (
            <ListRow
              key={verifier.id}
              leading={
                <EntityMonogram name={verifier.name} image={verifier.image} />
              }
              title={verifier.name}
              meta={
                verifier.username ? (
                  <>
                    {kinds[verifier.kind]} ·{" "}
                    <bdi dir="ltr">@{verifier.username}</bdi>
                  </>
                ) : (
                  kinds[verifier.kind]
                )
              }
              trailing={
                <Button
                  type="button"
                  variant="outline"
                  aria-label={m.removeNamed(verifier.name)}
                  onClick={() => setRemoveUserId(verifier.userId)}
                >
                  {common.remove}
                </Button>
              }
            />
          ))}
        </RowList>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="venue-verifier-search">{m.addLabel}</FieldLabel>
          <Input
            id="venue-verifier-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.searchPlaceholder}
            maxLength={100}
            autoComplete="off"
          />
        </Field>
        <Field className="sm:w-44">
          <FieldLabel htmlFor="venue-verifier-kind">{m.kindLabel}</FieldLabel>
          <Select
            value={kind}
            onValueChange={(next) => setKind(next as VerifierKind)}
          >
            <SelectTrigger id="venue-verifier-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {kinds[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {debouncedQuery.length > 0 && search.data && candidates.length === 0 ? (
        <p className="text-body text-muted-foreground">{m.noUsers}</p>
      ) : null}

      {candidates.length > 0 ? (
        <RowList>
          {candidates.map((candidate) => (
            <ListRow
              key={candidate.id}
              leading={
                <EntityMonogram name={candidate.name} image={candidate.image} />
              }
              title={candidate.name}
              meta={
                candidate.username ? (
                  <bdi dir="ltr">@{candidate.username}</bdi>
                ) : undefined
              }
              trailing={
                <Button
                  type="button"
                  aria-label={m.addNamed(candidate.name, kinds[kind])}
                  pending={
                    addVerifier.isPending &&
                    addVerifier.variables?.userId === candidate.id
                  }
                  pendingLabel={m.adding}
                  disabled={addVerifier.isPending}
                  onClick={() =>
                    addVerifier.mutate({ venueId, userId: candidate.id, kind })
                  }
                >
                  {m.add}
                </Button>
              }
            />
          ))}
        </RowList>
      ) : null}

      <ConfirmDialog
        open={removeUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveUserId(null);
          }
        }}
        title={m.removeTitle(removeName)}
        description={m.removeDescription}
        confirmLabel={m.removeConfirm}
        pending={removeVerifier.isPending}
        onConfirm={async () => {
          if (!removeUserId) {
            return;
          }
          await removeVerifier.mutateAsync({ venueId, userId: removeUserId });
        }}
      />
    </Section>
  );
}
