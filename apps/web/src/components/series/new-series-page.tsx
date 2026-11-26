"use client";

import { notFound, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { YouCard } from "~/components/you/you-section";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  DEFAULT_SERIES_COLOUR,
  DEFAULT_SERIES_EMBLEM,
  SERIES_NAME_MAX_LENGTH,
  seriesNameError,
  type SeriesColour,
  type SeriesEmblem,
} from "@repo/domain/series";
import {
  fieldErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { groupHomeHref, groupSeriesHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { SeriesBadge } from "./series-badge";
import { SeriesColourPicker, SeriesEmblemPicker } from "./series-pickers";

const RULES = ["social", "game", "draw"] as const;

function NewSeriesFrame({
  groupId,
  children,
}: {
  groupId: string;
  children: ReactNode;
}) {
  const m = useMessages();
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-6">
      <header className="mt-6 flex items-center justify-between gap-3 lg:mt-2">
        <BackButton variant="boxed" href={groupSeriesHref(groupId)} />
        <h1 className="text-body font-semibold">{m.series.create.title}</h1>
        <span aria-hidden="true" className="size-11 shrink-0" />
      </header>
      {children}
    </div>
  );
}

function Preview({
  name,
  groupName,
  emblem,
  colour,
}: {
  name: string;
  groupName: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
}) {
  const m = useMessages();
  return (
    <Surface
      as="section"
      tone="ink"
      radius="surface"
      aria-label={m.series.create.preview}
      className="flex flex-col items-center gap-3 px-5 py-[22px]"
    >
      <SeriesBadge
        emblem={emblem}
        colour={colour}
        size="preview"
        surface="focus"
      />
      <div className="w-full min-w-0 text-center">
        <p
          className={cn(
            "font-expanded break-words text-[26px] font-bold leading-[1.05] tracking-[-0.03em]",
            !name && "text-dim",
          )}
        >
          {name || m.series.create.namePlaceholder}
        </p>
        <p className="text-meta text-dim mt-1.5 break-words">{groupName}</p>
      </div>
      <div className="border-dimrule text-eyebrow text-dim flex w-full items-center gap-4 border-t pt-3">
        <SeriesBadge
          emblem={emblem}
          colour={colour}
          size="latest"
          count={1}
          surface="focus"
        />
        <span>{m.series.create.previewNote}</span>
      </div>
    </Surface>
  );
}

function Rules() {
  const m = useMessages();
  return (
    <YouCard>
      <dl className="divide-rule divide-y">
        {RULES.map((rule) => (
          <div
            key={rule}
            className="flex justify-between gap-3 px-4 py-[13px] text-[14px]"
          >
            <dt className="text-muted-foreground shrink-0">
              {m.series.create.rules[rule].label}
            </dt>
            <dd className="text-end font-semibold">
              {m.series.create.rules[rule].value}
            </dd>
          </div>
        ))}
      </dl>
    </YouCard>
  );
}

function NewSeriesForm({
  groupId,
  groupName,
  runningNames,
}: {
  groupId: string;
  groupName: string;
  runningNames: string[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [emblem, setEmblem] = useState<SeriesEmblem>(DEFAULT_SERIES_EMBLEM);
  const [colour, setColour] = useState<SeriesColour>(DEFAULT_SERIES_COLOUR);
  const [nameError, setNameError] = useState<string | null>(null);
  const createSeries = api.series.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.series.listForGroup.invalidate({ groupId }),
        utils.series.attachOptions.invalidate({ groupId }),
        utils.groups.byId.invalidate({ id: groupId }),
      ]);
      router.push(groupSeriesHref(groupId));
    },
    onError: (error) => {
      const fieldError = fieldErrorMessage(error, "name");
      if (fieldError) {
        setNameError(fieldError);
        nameRef.current?.focus();
        return;
      }
      toastGlobalFormError(error);
    },
  });
  const trimmed = name.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || createSeries.isPending) {
      return;
    }
    const error = seriesNameError(trimmed, runningNames, locale);
    if (error) {
      setNameError(error);
      nameRef.current?.focus();
      return;
    }
    createSeries.mutate({ groupId, name: trimmed, emblem, colour });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Preview
        name={trimmed}
        groupName={groupName}
        emblem={emblem}
        colour={colour}
      />

      <section className="flex flex-col gap-3">
        <label
          htmlFor="series-name"
          className="font-expanded text-title text-ink"
        >
          {m.series.create.nameLabel}
        </label>
        <div className="flex flex-col gap-2">
          <Input
            ref={nameRef}
            id="series-name"
            size="lg"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
            }}
            maxLength={SERIES_NAME_MAX_LENGTH}
            autoComplete="off"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={
              nameError
                ? "series-name-error series-name-hint"
                : "series-name-hint"
            }
          />
          <FieldError id="series-name-error">{nameError}</FieldError>
          <p
            id="series-name-hint"
            className="text-eyebrow text-muted-foreground leading-[1.5]"
          >
            {m.series.create.nameHint}
          </p>
        </div>
      </section>

      <SeriesEmblemPicker value={emblem} onChange={setEmblem} />
      <SeriesColourPicker value={colour} onChange={setColour} />
      <Rules />

      <div className="border-rule bg-background sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2 border-t py-4 lg:bottom-0">
        <Button
          type="submit"
          size="lg"
          className="w-full font-semibold"
          pending={createSeries.isPending}
          disabled={!trimmed}
        >
          {m.series.create.submit}
        </Button>
        <p className="text-eyebrow text-muted-foreground text-center">
          {m.series.create.submitNote}
        </p>
      </div>
    </form>
  );
}

function NewSeriesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <Skeleton className="h-13 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

/**
 * New series (1b): a name, an emblem and a colour, with a live preview of the
 * badge. Only a Group approver of a Verified Group stays on it; anyone else is
 * sent back to the Group's home.
 */
export function NewSeriesPage({ groupId }: { groupId: string }) {
  const m = useMessages();
  const router = useRouter();
  const list = api.series.listForGroup.useQuery({ groupId });
  const group = api.groups.byId.useQuery({ id: groupId });
  const refused = list.data
    ? !list.data.enabled || !list.data.canManage
    : false;

  useEffect(() => {
    if (refused) {
      router.replace(groupHomeHref(groupId));
    }
  }, [refused, router, groupId]);

  if (isNotFoundError(list.error) || isNotFoundError(group.error)) {
    notFound();
  }

  const error = list.error ?? group.error;
  if (error) {
    return (
      <NewSeriesFrame groupId={groupId}>
        <ErrorState
          title={m.series.tab.loadError}
          error={error}
          onRetry={() => {
            void list.refetch();
            void group.refetch();
          }}
        />
      </NewSeriesFrame>
    );
  }

  if (!list.data || !group.data || refused) {
    return (
      <NewSeriesFrame groupId={groupId}>
        <NewSeriesSkeleton />
      </NewSeriesFrame>
    );
  }

  return (
    <NewSeriesFrame groupId={groupId}>
      <NewSeriesForm
        groupId={groupId}
        groupName={group.data.name ?? m.invite.kind.group}
        runningNames={list.data.running.map((series) => series.name)}
      />
    </NewSeriesFrame>
  );
}
