"use client";

import { ErrorState } from "~/components/common/error-state";
import { SurfaceLabel } from "~/components/common/surface-label";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  deriveRecentForm,
  RECENT_FORM_MATCH_COUNT,
  type RecentFormBar,
} from "@repo/domain/home-recent-form";
import { FormSlot } from "~/components/home/home-recent-form-row";
import { Skeleton } from "~/components/ui/skeleton";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { api } from "~/trpc/react";

export function ProfileFormCard({ bars }: { bars: RecentFormBar[] }) {
  const m = useMessages();
  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile" meta={m.webAuth.home.recentForm.lastTen}>
        {m.webAuth.home.recentForm.title}
      </SurfaceLabel>
      <div className="flex gap-1.5 px-5 pb-[18px]">
        {bars.map((bar, index) => (
          <FormSlot
            key={
              bar.kind === "played"
                ? `${bar.outcome}-${index}`
                : `empty-${index}`
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
      className="border-rule rounded-card overflow-hidden border"
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

export function ProfileForm({ sport = DEFAULT_SPORT }: { sport?: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  const history = api.games.listMyMatchHistory.useQuery({
    limit: RECENT_FORM_MATCH_COUNT,
    sport,
  });

  if (history.isLoading) {
    return <ProfileFormSkeleton />;
  }

  if (history.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title={m.webAuth.you.recentFormFailed}
        message={history.error.message}
        onRetry={() => {
          void history.refetch();
        }}
      />
    );
  }

  const form = deriveRecentForm(history.data ?? [], locale);
  return <ProfileFormCard bars={form.bars} />;
}
