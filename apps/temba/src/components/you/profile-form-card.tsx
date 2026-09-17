"use client";

import { ErrorState } from "~/components/common/error-state";
import {
  deriveRecentForm,
  type RecentFormBar,
} from "~/components/home/home-recent-form";
import { FormSlot } from "~/components/home/home-recent-form-row";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export function ProfileFormCard({ bars }: { bars: RecentFormBar[] }) {
  return (
    <section className="border-rule bg-paper overflow-hidden rounded-[14px] border">
      <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
        <p className="text-ink text-body font-semibold">Form</p>
        <p className="text-eyebrow text-dim">last 10 matches</p>
      </div>
      <div className="flex gap-1.5 px-5 pb-[18px]">
        {bars.map((bar, index) => (
          <FormSlot
            key={
              bar.kind === "played" ? `${bar.label}-${index}` : `empty-${index}`
            }
            bar={bar}
            size="compact"
          />
        ))}
      </div>
    </section>
  );
}

function ProfileFormSkeleton() {
  return (
    <div
      aria-busy="true"
      className="border-rule overflow-hidden rounded-[14px] border"
    >
      <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
        <Skeleton className="h-[15px] w-10" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-1.5 px-5 pb-[18px]">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-[26px] flex-1 rounded-[4px]" />
        ))}
      </div>
    </div>
  );
}

export function ProfileForm() {
  const history = api.games.listMyMatchHistory.useQuery();

  if (history.isLoading) {
    return <ProfileFormSkeleton />;
  }

  if (history.error) {
    return (
      <ErrorState
        title="Form could not be loaded"
        message={history.error.message}
        onRetry={() => {
          void history.refetch();
        }}
      />
    );
  }

  const form = deriveRecentForm(history.data ?? []);
  return <ProfileFormCard bars={form.bars} />;
}
