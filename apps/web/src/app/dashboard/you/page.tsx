"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { FootballTab } from "~/components/you/football-tab";
import { PadelTab } from "~/components/you/padel-tab";
import { SetUpSportCard } from "~/components/you/set-up-sport-card";
import { SportChips } from "~/components/you/you-chips";
import {
  YouHeader,
  YouIdentity,
  YouIdentitySkeleton,
} from "~/components/you/you-header";
import { usePendingInviteCount } from "~/hooks/use-pending-invite-count";
import { type Sport } from "@repo/domain/sport";
import { api } from "~/trpc/react";

export default function YouPage() {
  const m = useMessages();
  const { user } = useUser();
  const invites = usePendingInviteCount();
  const details = api.users.profileDetails.useQuery();
  const [chosen, setChosen] = useState<Sport | null>(null);

  const sports = details.data?.sports ?? [];
  const sport =
    chosen && sports.includes(chosen) ? chosen : (sports[0] ?? null);
  const name =
    user?.fullName ?? details.data?.name ?? user?.username ?? m.common.you;
  const image = user
    ? user.hasImage
      ? user.imageUrl
      : null
    : (details.data?.image ?? null);

  return (
    <DashboardShell width="content" hidePageHeader hideMobileTopBar>
      <div className="mx-auto mt-6 flex w-full min-w-0 max-w-[1000px] flex-col gap-[22px] pb-10 lg:mt-2">
        <YouHeader pendingInviteCount={invites.showCount ? invites.count : 0} />
        {details.error ? (
          <ErrorState
            variant="inline"
            className="rounded-card px-5"
            message={details.error.message}
            onRetry={() => {
              void details.refetch();
            }}
          />
        ) : !details.data ? (
          <YouIdentitySkeleton />
        ) : (
          <>
            <YouIdentity
              name={name}
              image={image}
              homeArea={details.data.homeArea}
              memberSince={details.data.createdAt}
            />
            {sport === null ? (
              <SetUpSportCard />
            ) : (
              <section
                aria-label={m.common[sport]}
                className="flex flex-col gap-[18px]"
              >
                <SportChips
                  sports={sports}
                  value={sport}
                  onSelect={setChosen}
                />
                {sport === "padel" ? (
                  <PadelTab />
                ) : (
                  <FootballTab userId={details.data.id} />
                )}
              </section>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
